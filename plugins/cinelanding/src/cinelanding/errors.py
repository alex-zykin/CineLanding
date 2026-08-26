class CineLandingError(Exception):
    """Base error with a safe, user-facing message."""


class ConfigurationError(CineLandingError):
    """Configuration is missing or invalid."""


class ProjectError(CineLandingError):
    """A CineLanding project is invalid or incomplete."""


class ProviderError(CineLandingError):
    """A generation provider rejected or could not complete a request."""


class SubmissionUnknownError(ProviderError):
    """The provider may have accepted a request whose response was lost."""
