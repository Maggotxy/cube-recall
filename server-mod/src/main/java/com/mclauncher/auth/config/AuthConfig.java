package com.mclauncher.auth.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.mclauncher.auth.MCLauncherAuth;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Mod 配置文件
 * 存放在 config/mclauncher-auth.json
 */
public class AuthConfig {

    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    /** 后端 API 地址 */
    private String apiBaseUrl = "http://localhost:8000";

    /** Mod-Server 通信密钥 */
    private String apiKey = "";

    /** 验证超时时间（秒） */
    private int verifyTimeoutSeconds = 10;

    /** 验证失败时的踢出消息 */
    private String kickMessageNotVerified = "\u00a76[\u65b9\u5757\u56de\u53ec] \u00a7c\u8bf7\u901a\u8fc7 Cube Recall \u542f\u52a8\u5668\u767b\u5f55\u540e\u8fdb\u5165\u670d\u52a1\u5668";

    /** 验证超时时的踢出消息 */
    private String kickMessageTimeout = "\u00a76[\u65b9\u5757\u56de\u53ec] \u00a7c\u767b\u5f55\u9a8c\u8bc1\u8d85\u65f6\uff0c\u8bf7\u91cd\u8bd5";

    /** API 错误时的踢出消息 */
    private String kickMessageError = "\u00a76[\u65b9\u5757\u56de\u53ec] \u00a7c\u9a8c\u8bc1\u670d\u52a1\u5f02\u5e38\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5";

    /** 是否启用验证（方便调试时关闭） */
    private boolean enabled = true;

    /** 白名单用户名列表，这些用户跳过所有验证直接进服 */
    private String[] whitelist = new String[0];

    /** 运行时白名单 Set（不序列化） */
    private transient Set<String> whitelistSet;

    public String getApiBaseUrl() { return apiBaseUrl; }
    public String getApiKey() { return apiKey; }
    public int getVerifyTimeoutSeconds() { return verifyTimeoutSeconds; }
    public String getKickMessageNotVerified() { return kickMessageNotVerified; }
    public String getKickMessageTimeout() { return kickMessageTimeout; }
    public String getKickMessageError() { return kickMessageError; }
    public boolean isEnabled() { return enabled; }

    /** 检查用户名是否在白名单中（不区分大小写） */
    public boolean isWhitelisted(String username) {
        if (whitelistSet == null) {
            whitelistSet = new HashSet<>();
            for (String name : whitelist) {
                whitelistSet.add(name.toLowerCase());
            }
        }
        return whitelistSet.contains(username.toLowerCase());
    }

    /**
     * 从文件加载配置，不存在则创建默认配置
     */
    public static AuthConfig load(Path path) {
        if (Files.exists(path)) {
            try {
                String json = Files.readString(path);
                AuthConfig config = GSON.fromJson(json, AuthConfig.class);
                MCLauncherAuth.LOGGER.info("Config loaded from {}", path);
                return config;
            } catch (IOException e) {
                MCLauncherAuth.LOGGER.error("Failed to load config, using defaults", e);
            }
        }

        // 创建默认配置文件
        AuthConfig config = new AuthConfig();
        try {
            Files.createDirectories(path.getParent());
            Files.writeString(path, GSON.toJson(config));
            MCLauncherAuth.LOGGER.info("Default config created at {}", path);
        } catch (IOException e) {
            MCLauncherAuth.LOGGER.error("Failed to save default config", e);
        }
        return config;
    }
}
