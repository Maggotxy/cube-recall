package com.mclauncher.auth.util;

import com.mclauncher.auth.MCLauncherAuth;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;

/**
 * HTTP 工具类
 * 使用 Java 17 原生 HttpClient，所有请求异步执行避免阻塞服务器主线程
 */
public class HttpUtil {

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * 异步 POST JSON 请求
     */
    public static CompletableFuture<String> postJsonAsync(String url, String jsonBody, int timeoutSeconds) {
        return postJsonAsync(url, jsonBody, timeoutSeconds, null);
    }

    /**
     * 异步 POST JSON 请求（带 API Key）
     */
    public static CompletableFuture<String> postJsonAsync(String url, String jsonBody, int timeoutSeconds, String apiKey) {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("User-Agent", "MCLauncherAuth/1.0")
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody));

        if (apiKey != null && !apiKey.isEmpty()) {
            builder.header("X-Api-Key", apiKey);
            MCLauncherAuth.LOGGER.info("Sending X-Api-Key: [{}] (len={})", apiKey, apiKey.length());
        } else {
            MCLauncherAuth.LOGGER.warn("No API Key provided! apiKey={}", apiKey);
        }

        HttpRequest request = builder.build();
        MCLauncherAuth.LOGGER.info("Request headers: {}", request.headers().map());

        return HTTP_CLIENT.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(response -> {
                    if (response.statusCode() != 200) {
                        MCLauncherAuth.LOGGER.warn("API returned HTTP {}: {}", response.statusCode(), response.body());
                    }
                    return response.body();
                })
                .exceptionally(throwable -> {
                    MCLauncherAuth.LOGGER.error("HTTP request failed: {}", throwable.getMessage());
                    return null;
                });
    }
}
