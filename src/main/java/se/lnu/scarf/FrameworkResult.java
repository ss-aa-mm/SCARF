package se.lnu.scarf;

public record FrameworkResult(boolean success, String message) {
    public static FrameworkResult success(String message) { return new FrameworkResult(true, message); }
    public static FrameworkResult failure(String message) { return new FrameworkResult(false, message); }
}
