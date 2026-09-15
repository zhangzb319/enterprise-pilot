package com.zhang.enterprisepilotjava.common.filter;

import com.zhang.enterprisepilotjava.common.service.RedisService;
import com.zhang.enterprisepilotjava.common.util.JwtUtil;
import com.zhang.enterprisepilotjava.user.mapper.UserMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String ROLE_CACHE_PREFIX = "user:roles:";
    private static final long ROLE_CACHE_TTL_MINUTES = 10;

    private final JwtUtil jwtUtil;
    private final UserMapper userMapper;
    private final RedisService redisService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        if (jwtUtil.validateToken(token) && !jwtUtil.isBlacklisted(token)) {
            Long userId = jwtUtil.getUserIdFromToken(token);
            List<SimpleGrantedAuthority> authorities = getRoleCodes(userId).stream()
                    .map(SimpleGrantedAuthority::new)
                    .toList();
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(userId, null, authorities));
        }
        filterChain.doFilter(request, response);
    }

    // 优先读Redis缓存,无值时查DB并缓存10分钟
    private List<String> getRoleCodes(Long userId) {
        String cacheKey = ROLE_CACHE_PREFIX + userId;
        String cached = redisService.get(cacheKey);
        if (cached != null && !cached.isBlank()) {
            return List.of(cached.split(","));
        }
        List<String> roleCodes = userMapper.selectRoleCodesByUserId(userId);
        redisService.set(cacheKey, String.join(",", roleCodes), ROLE_CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        return roleCodes;
    }
}
