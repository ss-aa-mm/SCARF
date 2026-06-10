package se.lnu.scarf;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Controller
public class ScarfController {
    private final LaunchValidator launchValidator;

    public ScarfController(LaunchValidator launchValidator) {
        this.launchValidator = launchValidator;
    }

    @GetMapping("/")
    public String index() {
        return "index";
    }

    @GetMapping("/results{version}/{resultId}")
    public String results(@PathVariable String resultId, @PathVariable String version, Model model, RedirectAttributes redirectAttributes) {
        if (!"".equals(version) && !"_v2".equals(version)) return "redirect:/error";
        Path resultPath = launchValidator.getDataDirectory().resolve("results").resolve(resultId + ".json");
        if(!Files.exists(resultPath)) {
            redirectAttributes.addFlashAttribute("errorHeader", "Resource not found");
            redirectAttributes.addFlashAttribute("errorMessage", "The selected simulation result does not exist!");
            return "redirect:/error";
        }
        try {
            String missingFieldPlaceholder = "N/A";
            String jsonData = Files.readString(resultPath);
            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(jsonData);
            JsonNode metadata = rootNode.path("metadata");
            insertAlphaInfo(model, metadata.path("alpha").asDouble(0.5));
            model.addAttribute("modelName", metadata.path("modelName").asText(missingFieldPlaceholder));
            model.addAttribute("replications", metadata.path("replications").asText(missingFieldPlaceholder));
            model.addAttribute("arrivalDistributionDetails", metadata.path("arrivalDistributionDetails").asText(missingFieldPlaceholder));
            model.addAttribute("startTime", metadata.path("startTime").asText(missingFieldPlaceholder));
            model.addAttribute("duration", metadata.path("duration").asText(missingFieldPlaceholder));
            model.addAttribute("referencePeriod", metadata.path("referencePeriod").asText(missingFieldPlaceholder));
            model.addAttribute("resultId", resultId);
            model.addAttribute("jsonData", jsonData);
            return "results" + version;
        } catch (IOException e) {
            redirectAttributes.addFlashAttribute("errorHeader", "Could not read result file");
            redirectAttributes.addFlashAttribute("errorMessage", "Something went wrong when reading the simulation result!");
            return "redirect:/error";
        }
    }

    private void insertAlphaInfo(Model model, double alpha) {
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
