package se.lnu.scarf;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class CompilationComponent {

    private static final Logger logger = LoggerFactory.getLogger(CompilationComponent.class);

    public int compile(Path baseFolder, boolean usingSampleGci) throws Exception {
        logger.info("Launching the compiler and preparing the required dependencies...");
        Path sourceFolder = baseFolder.resolve("src/main/java");
        Path targetFolder = baseFolder.resolve("target/classes");
        String isolatedClasspath = buildTempClasspath(baseFolder);
        Files.createDirectories(targetFolder);
        copyGciResource(targetFolder, usingSampleGci);

        List<String> sources;
        try (Stream<Path> paths = Files.walk(sourceFolder)) {
            sources = paths
                    .map(Path::toString)
                    .filter(string -> string.endsWith(".java"))
                    .toList();
        }

        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        List<String> options = List.of(
                "-d", targetFolder.toString(),
                "-classpath", isolatedClasspath,
                "-X" + "lint:deprecation"
        );

        sources.forEach(source -> logger.info("Compiling {}", source));
        int result = compiler.run(null, null, null,
                Stream.concat(options.stream(), sources.stream()).toArray(String[]::new)
        );
        if (result == 0) logger.info("Compilation completed successfully");
        return result;
    }

    private static String buildTempClasspath(Path baseFolder) throws Exception {
        Path libFolder = baseFolder.resolve("lib");
        Files.createDirectories(libFolder);
        Path containerLib = Path.of("/workspace/BOOT-INF/lib");

        if (Files.exists(containerLib)) {
            logger.info("Running in container mode");
            try (Stream<Path> walk = Files.list(containerLib)) {
                walk.filter(p -> p.toString().endsWith(".jar"))
                        .filter(p -> ARTIFACT_IDS.stream().anyMatch(p.getFileName().toString()::contains))
                        .forEach(p -> {
                            try {
                                Files.copy(p, libFolder.resolve(p.getFileName()), StandardCopyOption.REPLACE_EXISTING);
                            } catch (IOException e) {
                                throw new RuntimeException(e);
                            }
                        });
            }
        } else {
            logger.info("Running in standard mode");
            String classpath = System.getProperty("java.class.path");
            for (String entry : classpath.split(File.pathSeparator)) {
                if (ARTIFACT_IDS.stream().anyMatch(entry::contains)) {
                    Path src = Path.of(entry);
                    Files.copy(src, libFolder.resolve(src.getFileName()), StandardCopyOption.REPLACE_EXISTING);
                }
            }
        }

        try (Stream<Path> walk = Files.list(libFolder)) {
            return walk.map(Path::toString)
                    .filter(string -> string.endsWith(".jar"))
                    .collect(Collectors.joining(File.pathSeparator));
        }
    }

    private static void copyGciResource(Path targetFolder, boolean usingSampleGci) throws IOException {
        String name = usingSampleGci ? "sample_gci.json" : "gci.json";
        String resultingName = "gci.json";
        Files.copy(
                Objects.requireNonNull(
                        CompilationComponent.class.getClassLoader().getResourceAsStream("static/" + name),
                        "Resource " + name + " can't be copied!"
                ),
                targetFolder.resolve(resultingName),
                StandardCopyOption.REPLACE_EXISTING
        );
    }

    private static final List<String> ARTIFACT_IDS = List.of(
            "jackson-databind",
            "jackson-core",
            "jackson-annotations",
            "cloudsimplus",
            "logback-classic",
            "logback-core",
            "slf4j-api",
            "commons-lang3",
            "commons-math3"
    );
}
