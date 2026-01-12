package se.lnu.scarf;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

@Component
public class ExecutionComponent {
    private static final Logger logger = LoggerFactory.getLogger(ExecutionComponent.class);

    public void execute(Path baseFolder, String mainClassQualifiedName) throws Exception {
        logger.info("Starting code execution...");
        logger.info("Targeting {}", mainClassQualifiedName);
        List<URL> urls = new ArrayList<>();
        Path targetFolder = baseFolder.resolve("target/classes");
        Path libFolder = baseFolder.resolve("lib");
        urls.add(targetFolder.toUri().toURL());
        try (Stream<Path> stream = Files.list(libFolder)) {
            urls.addAll(stream.filter(p -> p.toString().endsWith(".jar"))
                    .map(p -> {
                        try { return p.toUri().toURL(); } catch (MalformedURLException e) {
                            throw new RuntimeException(e);
                        }
                    }).toList());
        }
        try (URLClassLoader classLoader = new URLClassLoader(urls.toArray(new URL[0]), null)) {
            Thread.currentThread().setContextClassLoader(classLoader);
            Class<?> mainClass = Class.forName(mainClassQualifiedName, true, classLoader);
            Method mainMethod = mainClass.getMethod("main", String[].class);
            mainMethod.setAccessible(true);
            String[] arguments = { baseFolder.toString() };
            logger.info("Executing main method...");
            mainMethod.invoke(null, (Object) arguments);
            logger.info("Simulation successfully executed!");
        } finally {
            Thread.currentThread().setContextClassLoader(null);
            System.gc();
        }
    }
}