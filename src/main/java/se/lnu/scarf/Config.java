package se.lnu.scarf;

import org.jspecify.annotations.NonNull;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.util.UriComponentsBuilder;

@Configuration
@EnableAsync
public class Config implements WebMvcConfigurer {

    private final LaunchValidator launchValidator;

    public Config(LaunchValidator launchValidator) {
        this.launchValidator = launchValidator;
    }

    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
        configurer.setTaskExecutor(frameworkExecutor());
        configurer.setDefaultTimeout(60000);
    }

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        if (launchValidator.getExecutionMode() == ExecutionMode.TEMURIN_CONTAINER) {
            registry.addResourceHandler("/generated-plots/**")
                    .addResourceLocations(
                            UriComponentsBuilder
                                    .fromUri(ResultsPresentation.PYTHON_OUTPUT_FOLDER_BASE.toUri())
                                    .path("/")
                                    .build()
                                    .toUriString()
                    );
        }
    }

    @Bean(name = "frameworkExecutor")
    public ThreadPoolTaskExecutor frameworkExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("SCARF-frameworkExecutor-");
        executor.setAllowCoreThreadTimeOut(true);
        executor.setKeepAliveSeconds(1);
        executor.setWaitForTasksToCompleteOnShutdown(false);
        executor.setThreadFactory(r -> {
            Thread t = new Thread(r);
            t.setDaemon(true);
            t.setName("SCARF-frameworkExecutor-" + t.threadId());
            return t;
        });
        return executor;
    }
}
