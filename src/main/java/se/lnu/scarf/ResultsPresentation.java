package se.lnu.scarf;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import org.springframework.ui.Model;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;

public enum ResultsPresentation {
    RESULTS("results", false, true) {
        @Override
        public void configure(Model model, Path resultPath, JsonNode rootNode, String resultId) {
            String missingFieldPlaceholder = "N/A";
            JsonNode metadata = rootNode.path("metadata");
            insertAlphaInfo(model, metadata.path("alpha").asDouble(0.5));
            model.addAttribute("resultId", resultId);
            model.addAttribute("modelName", metadata.path("modelName").asText(missingFieldPlaceholder));
            model.addAttribute("replications", metadata.path("replications").asText(missingFieldPlaceholder));
            model.addAttribute("arrivalDistributionDetails", metadata.path("arrivalDistributionDetails").asText(missingFieldPlaceholder));
            model.addAttribute("startTime", metadata.path("startTime").asText(missingFieldPlaceholder));
            model.addAttribute("duration", metadata.path("duration").asText(missingFieldPlaceholder));
            model.addAttribute("referencePeriod", metadata.path("referencePeriod").asText(missingFieldPlaceholder));
        }
    },
    RESULTS_V2("results_v2", false, true) {
        @Override
        public void configure(Model model, Path resultPath, JsonNode rootNode, String resultId) {
            RESULTS.configure(model, resultPath, rootNode, resultId);
        }
    },
    RESULTS_V3("results_v3", true, false) {
        @Override
        public void configure(Model model, Path resultPath, JsonNode rootNode, String resultId) {
            try {
                Path targetFolder = PYTHON_OUTPUT_FOLDER_BASE.resolve(resultId);
                Files.createDirectories(targetFolder);
                for (String fi : SUPPORTED_FUNCTIONAL_UNITS) {
                    ProcessBuilder pb = new ProcessBuilder(
                            "python3",
                            PYTHON_INPUT_FOLDER_BASE.resolve(fi + "_figure.py").toString(),
                            resultPath.toString(),
                            targetFolder.resolve(fi).toString()
                    );
                    pb.redirectErrorStream(true);
                    Process process = pb.start();
                    int exitCode = process.waitFor();
                    if (exitCode != 0)
                        throw new IOException(fi + " output generation failed with exit code " + exitCode);
                }
            } catch (IOException | InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Something went wrong when generating the output for resultId " + resultId);
            }
        }
    };

    @Getter
    private final String endpointIdentifier;
    @Getter
    private final boolean isPythonRequired;
    @Getter
    private final boolean isFrontendDataRequired;

    public static final Path PYTHON_OUTPUT_FOLDER_BASE = Path.of("/tmp/output");
    private static final Path PYTHON_INPUT_FOLDER_BASE = Path.of("/app/python");
    private static final List<String> SUPPORTED_FUNCTIONAL_UNITS = List.of("interaction", "device");

    ResultsPresentation(
            String endpointIdentifier,
            boolean isPythonRequired,
            boolean isFrontendDataRequired) {
        this.endpointIdentifier = endpointIdentifier;
        this.isPythonRequired = isPythonRequired;
        this.isFrontendDataRequired = isFrontendDataRequired;
    }

    public abstract void configure(Model model, Path resultPath, JsonNode rootNode, String resultId);

    public static List<String> availableEndpoints(boolean isPythonSupported) {
        return Arrays.stream(values())
                .filter(endpoint -> !endpoint.isPythonRequired() || isPythonSupported)
                .map(ResultsPresentation::getEndpointIdentifier)
                .toList();
    }

    public static boolean configure(String name, Model model, Path resultPath, String resultId) {
        try {
            ResultsPresentation endpoint = Arrays.stream(values())
                    .filter(ep -> ep.getEndpointIdentifier().equals(name))
                    .findFirst()
                    .orElseThrow(IOException::new);

            JsonNode rootNode = null;
            if (endpoint.isFrontendDataRequired()) {
                String jsonData = Files.readString(resultPath);
                ObjectMapper mapper = new ObjectMapper();
                rootNode = mapper.readTree(jsonData);
                model.addAttribute("jsonData", jsonData);
            }
            endpoint.configure(model, resultPath, rootNode, resultId);
        } catch (IOException e) {
            return false;
        }
        return true;
    }

    private static void insertAlphaInfo(Model model, double alpha) {
        double needleRad = Math.toRadians(180 - alpha * 180);
        model.addAttribute("alpha", alpha);
        model.addAttribute("dialEndX", Math.cos(needleRad) * 50);
        model.addAttribute("dialEndY", -Math.sin(needleRad) * 50);
        model.addAttribute("dialNeedleX", Math.cos(needleRad) * 41);
        model.addAttribute("dialNeedleY", -Math.sin(needleRad) * 41);
        model.addAttribute("alphaMode",
                alpha <= 0.1 ? "Performance-oriented" :
                        alpha <= 0.3 ? "Performance-focused" :
                                alpha <= 0.7 ? "Balanced" :
                                        alpha <= 0.9 ? "Sustainability-focused" : "Sustainability-oriented");
    }
}


