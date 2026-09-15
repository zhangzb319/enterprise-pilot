package com.zhang.enterprisepilotjava.common.util;

import com.zhang.enterprisepilotjava.common.service.RedisService;
import com.zhang.enterprisepilotjava.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class JwtUtil {

    private final JwtProperties jwtProperties;

    private final RedisService redisService;

    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";

    private SecretKey getKey() {
        return Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes());
    }

    // 生成Token,存入用户ID
    public String generateToken(Long userId) {
        Date now = new Date();
        Date expireDate = new Date(now.getTime() + jwtProperties.getExpiration());

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(now)
                .expiration(expireDate)
                .signWith(getKey())
                .compact();
    }

    // 从Token解析用户ID
    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return Long.valueOf(claims.getSubject());
    }

    // 验证Token是否过期
    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(getKey()).build().parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // 将Token加入黑名单,TTL与Token有效期一致(24h)
    public void addToBlacklist(String token) {
        redisService.set(BLACKLIST_PREFIX + token, "1", jwtProperties.getExpiration(), TimeUnit.MILLISECONDS);
    }

    // 判断Token是否在黑名单中
    public boolean isBlacklisted(String token) {
        return redisService.exists(BLACKLIST_PREFIX + token);
    }
}
