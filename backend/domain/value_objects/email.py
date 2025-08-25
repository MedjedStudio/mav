import re
from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class Email:
    value: str

    def __post_init__(self):
        if self.value is not None:
            self._validate()

    def _validate(self):
        if not self.value:
            raise ValueError("Email cannot be empty")
        
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, self.value):
            raise ValueError(f"Invalid email format: {self.value}")

    @classmethod
    def create(cls, value: Optional[str]) -> Optional['Email']:
        if value is None:
            return None
        return cls(value)

    def __str__(self) -> str:
        return self.value