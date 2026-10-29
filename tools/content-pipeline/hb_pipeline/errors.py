class PipelineError(Exception):
    """Base exception for expected pipeline failures."""


class SourceConfigurationError(PipelineError):
    """Trusted source configuration is invalid."""


class DomainNotAllowedError(PipelineError):
    """A requested or redirected URL is outside the configured allowlist."""


class RobotsPolicyError(PipelineError):
    """Automated fetching is not allowed or robots policy cannot be verified."""


class FetchError(PipelineError):
    """HTTP/network/content validation failed."""
