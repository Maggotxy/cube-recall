package com.mclauncher.auth;

import com.mclauncher.auth.config.AuthConfig;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.loading.FMLPaths;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.nio.file.Path;

@Mod(MCLauncherAuth.MOD_ID)
public class MCLauncherAuth {

    public static final String MOD_ID = "mclauncherauth";
    public static final Logger LOGGER = LogManager.getLogger();

    private static AuthConfig config;

    public MCLauncherAuth() {
        // 加载配置
        Path configPath = FMLPaths.CONFIGDIR.get().resolve("mclauncher-auth.json");
        config = AuthConfig.load(configPath);

        // 注册事件处理器
        MinecraftForge.EVENT_BUS.register(new PlayerAuthHandler(config));
        MinecraftForge.EVENT_BUS.register(new AntiCheatHandler(config));

        LOGGER.info("[Cube Recall] Auth Mod loaded! API: {}", config.getApiBaseUrl());
        LOGGER.info("[Cube Recall] AntiCheat system enabled");
    }

    public static AuthConfig getConfig() {
        return config;
    }
}
