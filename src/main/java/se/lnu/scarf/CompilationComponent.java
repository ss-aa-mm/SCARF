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

    public int compile(Path baseFolder) throws Exception {
        logger.info("Launching the compiler and preparing the required dependencies...");
        Path sourceFolder = baseFolder.resolve("src/main/java");
        Path targetFolder = baseFolder.resolve("target/classes");
        String isolatedClasspath = buildTempClasspath(baseFolder);
        Files.createDirectories(targetFolder);
        copyResource("gcis.dtd", targetFolder);
        copyResource("gcis.xml", targetFolder);

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
        ProcessBuilder processBuilder = new ProcessBuilder(
                "mvn",
                "dependency:copy-dependencies",
                "-D" + "outputDirectory=" + libFolder.toAbsolutePath(),
                "-D" + "includeArtifactIds=" + String.join(",", ARTIFACT_IDS)
        );
        processBuilder.directory(new File(System.getProperty("user.dir")));
        Process process = processBuilder.start();
        int exitCode = process.waitFor();
        if (exitCode != 0) throw new RuntimeException(
                "Maven could not copy the dependencies to compile the generated code."
        );
        try (Stream<Path> walk = Files.list(libFolder)) {
            return walk.map(Path::toString)
                    .filter(string -> string.endsWith(".jar"))
                    .collect(Collectors.joining(File.pathSeparator));
        }
    }

    private static void copyResource(String name, Path targetFolder) throws IOException {
        Files.copy(
                Objects.requireNonNull(
                        CompilationComponent.class.getClassLoader().getResourceAsStream("static/" + name),
                        "Resource " + name + " can't be copied!"
                ),
                targetFolder.resolve(name),
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
