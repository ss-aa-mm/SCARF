package se.lnu.scarf;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Controller
public class ScarfController {
    private final LaunchValidator launchValidator;
    private final List<String> resultsVersionEndpoints;

    public ScarfController(LaunchValidator launchValidator) {
        this.launchValidator = launchValidator;
        this.resultsVersionEndpoints =
                ResultsPresentation.availableEndpoints(launchValidator.getExecutionMode().isPhytonSupported());
    }

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("redirectTarget",
                launchValidator.getExecutionMode().isPhytonSupported()
                        ? ResultsPresentation.RESULTS_V3.getEndpointIdentifier() // Default redirect for Temurin
                        : ResultsPresentation.RESULTS.getEndpointIdentifier()    // Default redirect for SpringBoot
        );
        return "index";
    }

    @GetMapping("/api/{endpoint}/{resultId}")
    public String results(@PathVariable String resultId, @PathVariable String endpoint, Model model, RedirectAttributes redirectAttributes) {
        if (!resultsVersionEndpoints.contains(endpoint)) return "redirect:/error";
        Path resultPath = launchValidator.getDataDirectory().resolve("results").resolve(resultId + ".json");
        if (!Files.exists(resultPath)) {
            redirectAttributes.addFlashAttribute("errorHeader", "Resource not found");
            redirectAttributes.addFlashAttribute("errorMessage", "The selected simulation result does not exist!");
            return "redirect:/error";
        }
        if (ResultsPresentation.configure(endpoint, model, resultPath, resultId)) {
            return endpoint;
        } else {
            redirectAttributes.addFlashAttribute("errorHeader", "Could not read result file");
            redirectAttributes.addFlashAttribute("errorMessage", "Something went wrong when reading the simulation result!");
            return "redirect:/error";
        }
    }
}
