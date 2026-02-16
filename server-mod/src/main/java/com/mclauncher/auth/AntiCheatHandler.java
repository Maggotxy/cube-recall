package com.mclauncher.auth;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.mclauncher.auth.config.AuthConfig;
import com.mclauncher.auth.util.HttpUtil;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.eventbus.api.SubscribeEvent;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 反作弊处理器
 *
 * 检测项：
 * 1. 飞行检测 - 非飞行模式下长时间滞空
 * 2. 速度检测 - 水平移动速度超过阈值
 * 3. 连续违规处理 - 累计违规次数超阈值后踢出并上报
 */
public class AntiCheatHandler {

    private static final Gson GSON = new Gson();
    private final AuthConfig config;

    // 玩家位置追踪
    private final Map<UUID, PlayerTrackData> trackData = new ConcurrentHashMap<>();

    // 反作弊参数
    private static final double MAX_HORIZONTAL_SPEED = 12.0;  // 方块/秒（正常疾跑 ~5.6 + 冲刺跳跃）
    private static final int MAX_AIR_TICKS = 80;             // 滞空tick阈值（4秒）
    private static final int VIOLATION_THRESHOLD = 5;         // 违规次数阈值
    private static final int CHECK_INTERVAL = 20;             // 检测间隔（tick，1秒）
    private static final double TELEPORT_THRESHOLD = 50.0;   // 距离超过此值视为传送（方块）

    public AntiCheatHandler(AuthConfig config) {
        this.config = config;
    }

    @SubscribeEvent
    public void onPlayerLoggedIn(PlayerEvent.PlayerLoggedInEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            trackData.put(player.getUUID(), new PlayerTrackData(player.position()));
        }
    }

    @SubscribeEvent
    public void onPlayerLoggedOut(PlayerEvent.PlayerLoggedOutEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            trackData.remove(player.getUUID());
        }
    }

    @SubscribeEvent
    public void onServerTick(TickEvent.ServerTickEvent event) {
        if (event.phase != TickEvent.Phase.END) return;

        for (Map.Entry<UUID, PlayerTrackData> entry : trackData.entrySet()) {
            PlayerTrackData data = entry.getValue();
            data.tickCount++;

            // 每秒检测一次
            if (data.tickCount % CHECK_INTERVAL != 0) continue;

            ServerPlayer player = findPlayer(entry.getKey());
            if (player == null || player.hasDisconnected()) {
                trackData.remove(entry.getKey());
                continue;
            }

            // 跳过创造/旁观模式和飞行模式
            if (player.isCreative() || player.isSpectator() || player.getAbilities().flying) {
                data.updatePosition(player.position());
                data.airTicks = 0;
                continue;
            }

            checkPlayer(player, data);
        }
    }

    private void checkPlayer(ServerPlayer player, PlayerTrackData data) {
        Vec3 currentPos = player.position();
        Vec3 lastPos = data.lastPosition;

        // 1. 速度检测
        double dx = currentPos.x - lastPos.x;
        double dz = currentPos.z - lastPos.z;
        double horizontalDistance = Math.sqrt(dx * dx + dz * dz);

        // 跳过传送造成的瞬移（距离过大说明是 /tp 等命令）
        if (horizontalDistance > TELEPORT_THRESHOLD) {
            MCLauncherAuth.LOGGER.debug("[AntiCheat] Ignoring teleport for {}: moved {} blocks",
                    player.getName().getString(), String.format("%.1f", horizontalDistance));
            data.updatePosition(currentPos);
            data.airTicks = 0;
            return;
        }

        if (horizontalDistance > MAX_HORIZONTAL_SPEED) {
            data.violations++;
            MCLauncherAuth.LOGGER.warn("[AntiCheat] Speed violation: {} moved {} blocks/s (limit: {})",
                    player.getName().getString(), String.format("%.1f", horizontalDistance), MAX_HORIZONTAL_SPEED);
        }

        // 2. 飞行检测（非飞行状态下长时间不在地面）
        if (!player.onGround() && !player.isInWater() && !player.isInLava()
                && !player.isFallFlying() && !player.isPassenger()) {
            data.airTicks += CHECK_INTERVAL;
            if (data.airTicks > MAX_AIR_TICKS) {
                data.violations++;
                MCLauncherAuth.LOGGER.warn("[AntiCheat] Flight violation: {} airborne for {} ticks",
                        player.getName().getString(), data.airTicks);
            }
        } else {
            data.airTicks = 0;
        }

        // 3. 违规处理
        if (data.violations >= VIOLATION_THRESHOLD) {
            String playerName = player.getName().getString();
            MCLauncherAuth.LOGGER.warn("[AntiCheat] Kicking {} for {} violations", playerName, data.violations);

            // 踢出玩家
            player.connection.disconnect(
                    Component.literal("\u00a7c[MCLauncher AntiCheat]\n\u00a7f检测到异常行为，已被踢出服务器")
            );

            // 上报到后端
            reportViolation(playerName, player.getIpAddress(), data.violations);

            trackData.remove(player.getUUID());
            return;
        }

        data.updatePosition(currentPos);
    }

    /**
     * 向后端上报违规
     */
    private void reportViolation(String playerName, String playerIp, int violationCount) {
        JsonObject body = new JsonObject();
        body.addProperty("username", playerName);
        body.addProperty("client_ip", playerIp);
        body.addProperty("violation_count", violationCount);
        body.addProperty("reason", "anticheat_auto_kick");

        String apiUrl = config.getApiBaseUrl() + "/anticheat/report";
        HttpUtil.postJsonAsync(apiUrl, GSON.toJson(body), config.getVerifyTimeoutSeconds(), config.getApiKey())
                .thenAccept(resp -> {
                    if (resp != null) {
                        MCLauncherAuth.LOGGER.info("[AntiCheat] Reported violation for {}", playerName);
                    }
                });
    }

    private ServerPlayer findPlayer(UUID uuid) {
        // 通过所有在线玩家查找
        var server = net.minecraftforge.server.ServerLifecycleHooks.getCurrentServer();
        if (server == null) return null;
        return server.getPlayerList().getPlayer(uuid);
    }

    /**
     * 玩家追踪数据
     */
    private static class PlayerTrackData {
        Vec3 lastPosition;
        int airTicks = 0;
        int violations = 0;
        int tickCount = 0;

        PlayerTrackData(Vec3 position) {
            this.lastPosition = position;
        }

        void updatePosition(Vec3 position) {
            this.lastPosition = position;
        }
    }
}
