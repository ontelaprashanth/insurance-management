
package com.htc.insurance.exception;

public class ResourceNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    // =========================================================
    // DEFAULT CONSTRUCTOR
    // =========================================================

    public ResourceNotFoundException() {
        super();
    }

    // =========================================================
    // MESSAGE CONSTRUCTOR
    // =========================================================

    public ResourceNotFoundException(String message) {
        super(message);
    }

    // =========================================================
    // MESSAGE AND CAUSE CONSTRUCTOR
    // =========================================================

    public ResourceNotFoundException(
            String message,
            Throwable cause) {

        super(message, cause);
    }
}
