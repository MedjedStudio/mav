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
        
        if not self.value.replace('_', '').replace('-', '').isalnum():
            raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")

    def __str__(self) -> str:
        return self.value