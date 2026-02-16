package com.mclauncher.auth;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mclauncher.auth.config.AuthConfig;
import com.mclauncher.auth.util.HttpUtil;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;

/**
 * 玩家登录验证处理器
 *
 * 流程：
 * 1. 玩家通过启动器登录，启动器向后端 API 获取 Token 并记录 IP
 * 2. 启动器启动 MC，传入用户名
 * 3. 玩家进入服务器 → 本 Mod 获取玩家 IP 和用户名
 * 4. 异步调用后端 /auth/verify 接口验证 Token + IP
 * 5. 验证失败 → 踢出玩家
 *
 * 注意：启动器在登录后会向后端保存 Token，后端记录了 IP。
 * 这里 Mod 不需要知道 Token，而是让后端根据用户名 + IP 来验证
 * 该玩家是否通过启动器合法登录过。
 */
public class PlayerAuthHandler {

    private static final Gson GSON = new Gson();
    private final AuthConfig config;

    public PlayerAuthHandler(AuthConfig config) {
        this.config = config;
    }

    @SubscribeEvent
    public void onPlayerLoggedIn(PlayerEvent.PlayerLoggedInEvent event) {
        if (!(event.getEntity() instanceof ServerPlayer serverPlayer)) {
            return;
        }

        if (!config.isEnabled()) {
            MCLauncherAuth.LOGGER.debug("Auth is disabled, skipping verification for {}",
                    serverPlayer.getName().getString());
            return;
        }

        String playerName = serverPlayer.getName().getString();
        String playerIp = serverPlayer.getIpAddress();
        MinecraftServer server = serverPlayer.getServer();

        // 白名单检查：跳过所有验证直接放行
        if (config.isWhitelisted(playerName)) {
            MCLauncherAuth.LOGGER.info("Player {} is whitelisted, skipping verification", playerName);
            serverPlayer.sendSystemMessage(
                    Component.literal("\u00a76[\u00a7e\u2620 \u00a7b\u65b9\u5757\u56de\u53ec\u00a76] \u00a7a\u767d\u540d\u5355\u7528\u6237\uff0c\u00a7f\u6b22\u8fce\u56de\u6765\uff0c\u00a7e" + playerName + "\u00a7f\uff01")
            );
            return;
        }

        MCLauncherAuth.LOGGER.info("Verifying player: {} (IP: {})", playerName, playerIp);

        // 构建验证请求
        JsonObject requestBody = new JsonObject();
        requestBody.addProperty("username", playerName);
        requestBody.addProperty("client_ip", playerIp);

        String apiUrl = config.getApiBaseUrl() + "/auth/verify-player";

        // 异步调用后端 API 验证
        HttpUtil.postJsonAsync(apiUrl, GSON.toJson(requestBody), config.getVerifyTimeoutSeconds(), config.getApiKey())
                .thenAccept(responseBody -> {
                    // 回到服务器主线程处理结果
                    if (server == null) return;
                    server.execute(() -> handleVerifyResponse(serverPlayer, playerName, responseBody));
                });
    }

    /**
     * 处理验证响应（在服务器主线程执行）
     */
    private void handleVerifyResponse(ServerPlayer player, String playerName, String responseBody) {
        // 玩家可能已经离线
        if (player.hasDisconnected()) {
            return;
        }

        // API 请求失败（网络错误等）
        if (responseBody == null) {
            MCLauncherAuth.LOGGER.warn("Auth API unreachable for player: {}", playerName);
            player.connection.disconnect(Component.literal(config.getKickMessageError()));
            return;
        }

        try {
            JsonObject response = JsonParser.parseString(responseBody).getAsJsonObject();

            // 处理 API 错误响应（如 403 返回 {"detail":"..."}）
            if (response.has("detail") && !response.has("valid")) {
                String detail = response.get("detail").getAsString();
                MCLauncherAuth.LOGGER.warn("Player {} API error: {}", playerName, detail);
                player.connection.disconnect(Component.literal(config.getKickMessageError()));
                return;
            }

            boolean valid = response.has("valid") && response.get("valid").getAsBoolean();

            if (valid) {
                MCLauncherAuth.LOGGER.info("Player {} verified successfully", playerName);
                player.sendSystemMessage(
                        Component.literal("\u00a76[\u00a7e\u2620 \u00a7b\u65b9\u5757\u56de\u53ec\u00a76] \u00a7a\u9a8c\u8bc1\u6210\u529f\uff01\u00a7f\u6b22\u8fce\u56de\u5230\u6218\u573a\uff0c\u00a7e" + playerName + "\u00a7f\uff01\u00a77 \u2014 \u67aa\u6797\u5f39\u96e8\uff0c\u65b9\u5757\u6218\u573a")
                );
            } else {
                String reason = response.has("reason") ? response.get("reason").getAsString() : "unknown";
                MCLauncherAuth.LOGGER.warn("Player {} failed verification: {}", playerName, reason);
                player.connection.disconnect(
                        Component.literal(config.getKickMessageNotVerified() + "\n\u00a7c\u539f\u56e0: " + reason)
                );
            }
        } catch (Exception e) {
            MCLauncherAuth.LOGGER.error("Failed to parse auth response for {}: {}", playerName, e.getMessage());
            player.connection.disconnect(Component.literal(config.getKickMessageError()));
        }
    }
}
