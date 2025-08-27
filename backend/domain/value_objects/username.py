from dataclasses import dataclass

@dataclass(frozen=True)
class Username:
    value: str

    def __post_init__(self):
        self._validate()

    def _validate(self):
        if not self.value:
            raise ValueError("Username cannot be empty")
        
        if len(self.value) < 3:
            raise ValueError("Username must be at least 3 characters long")
        
        if len(self.value) > 50:
            raise ValueError("Username must be 50 characters or less")
        
        # Allow letters, numbers, underscores, hyphens, and spaces
        allowed_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_- ')
        if not all(char in allowed_chars for char in self.value):
            raise ValueError("Username can only contain letters, numbers, underscores, hyphens, and spaces")

    def __str__(self) -> str:
        return self.value