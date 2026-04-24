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

    @GetMapping("/results/{resultId}")
    public String results(@PathVariable(value = "resultId") String resultId, Model model, RedirectAttributes redirectAttributes) {
        Path resultPath = launchValidator.getDataDirectory().resolve("results").resolve(resultId + ".json");
        if(!Files.exists(resultPath)) {
            redirectAttributes.addFlashAttribute("errorHeader", "Resource not found");
            redirectAttributes.addFlashAttribute("errorMessage", "The selected simulation result does not exist!");
            return "redirect:/error";
        }
        try {
            String jsonData = Files.readString(resultPath);
            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(jsonData);
            JsonNode metadata = rootNode.path("metadata");
            model.addAttribute("modelName", metadata.path("modelName").asText());
            model.addAttribute("replications", metadata.path("replications").asText());
            model.addAttribute("arrivalDistributionDetails", metadata.path("arrivalDistributionDetails").asText());
            model.addAttribute("resultId", resultId);
            model.addAttribute("jsonData", jsonData);
            return "results";
        } catch (IOException e) {
            redirectAttributes.addFlashAttribute("errorHeader", "Could not read result file");
            redirectAttributes.addFlashAttribute("errorMessage", "Something went wrong when reading the simulation result!");
            return "redirect:/error";
        }
    }
}
