class PipelineError(Exception):
    """Base exception for expected pipeline failures."""


class SourceConfigurationError(PipelineError):
    """Trusted source configuration is invalid."""


class DomainNotAllowedError(PipelineError):
    """A requested or redirected URL is outside the configured allowlist."""


class RobotsPolicyError(PipelineError):
    """Automated fetching is not allowed or robots policy cannot be verified."""


class FetchError(PipelineError):
    """HTTP/network/content validation failed, with machine-readable context."""
    def __init__(self, message, code="fetch-error", http_status=None, retryable=False, attempts=None):
        super().__init__(message)
        self.code, self.http_status, self.retryable = code, http_status, retryable
        self.attempts = attempts or []


class ValidationError(PipelineError):
    """An extraction or draft does not contain usable, reviewable evidence."""


class StorageError(PipelineError):
    """Existing pipeline records cannot be safely read or saved."""
