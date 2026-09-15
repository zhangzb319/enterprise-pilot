package com.zhang.enterprisepilotjava.common.service;

import lombok.RequiredArgsConstructor;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RedisService {

    private static final String KEY_PREFIX = "enterprise:pilot:";

    private final StringRedisTemplate stringRedisTemplate;

    private final ObjectMapper objectMapper;

    private String key(String rawKey) {
        return KEY_PREFIX + rawKey;
    }

    public void set(String rawKey, String value) {
        stringRedisTemplate.opsForValue().set(key(rawKey), value);
    }

    public void set(String rawKey, String value, long timeout, TimeUnit unit) {
        stringRedisTemplate.opsForValue().set(key(rawKey), value, timeout, unit);
    }

    public String get(String rawKey) {
        return stringRedisTemplate.opsForValue().get(key(rawKey));
    }

    public void delete(String rawKey) {
        stringRedisTemplate.delete(key(rawKey));
    }

    public boolean exists(String rawKey) {
        return Boolean.TRUE.equals(stringRedisTemplate.hasKey(key(rawKey)));
    }

    public long increment(String rawKey) {
        Long value = stringRedisTemplate.opsForValue().increment(key(rawKey));
        return value == null ? 0L : value;
    }

    public long decrement(String rawKey) {
        Long value = stringRedisTemplate.opsForValue().decrement(key(rawKey));
        return value == null ? 0L : value;
    }

    public void sadd(String rawKey, String... values) {
        stringRedisTemplate.opsForSet().add(key(rawKey), values);
    }

    public boolean sismember(String rawKey, String value) {
        return Boolean.TRUE.equals(stringRedisTemplate.opsForSet().isMember(key(rawKey), value));
    }

    public Set<String> smembers(String rawKey) {
        return stringRedisTemplate.opsForSet().members(key(rawKey));
    }

    public String serializeList(List<?> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JacksonException e) {
            return "[]";
        }
    }

    public <T> List<T> deserializeList(String json, Class<T> elementType) {
        try {
            return objectMapper.readValue(json, objectMapper.getTypeFactory()
                    .constructCollectionType(List.class, elementType));
        } catch (JacksonException e) {
            return Collections.emptyList();
        }
    }
}
