package com.zhang.enterprisepilotjava.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.module.SimpleModule;

import java.time.LocalDateTime;

@Configuration
public class JacksonConfig {

    @Bean
    public JsonMapperBuilderCustomizer flexibleLocalDateTimeCustomizer() {
        SimpleModule module = new SimpleModule("flexible-local-datetime");
        module.addDeserializer(LocalDateTime.class, new FlexibleLocalDateTimeDeserializer());
        return builder -> builder.addModule(module);
    }
}