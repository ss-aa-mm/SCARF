package se.lnu.scarf;

import lombok.Getter;

public enum ExecutionMode {
    SPRING_BOOT_RUN("Running in Standard mode", false, false),
    SPRING_BOOT_CONTAINER("Running in lightweight Container mode", true, false),
    TEMURIN_CONTAINER("Running in full Container mode", true, true);

    private final String description;
    @Getter
    private final boolean isContainer;
    @Getter
    private final boolean isPhytonSupported;

    ExecutionMode(String description, boolean isContainer, boolean hasPhytonSupport) {
        this.description = description;
        this.isContainer = isContainer;
        this.isPhytonSupported = hasPhytonSupport;
    }

    @Override
    public String toString() {
        return this.description;
    }
}
