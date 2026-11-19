"""Transport-neutral delivery contract. Providers translate their own failures."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum


@dataclass(frozen=True)
class NotificationMessage:
    title: str
    body: str
    url: str = "/notifications"


class DeliveryResult(Enum):
    SENT = "sent"
    EXPIRED = "expired"
    FAILED = "failed"


class PushProvider(ABC):
    @abstractmethod
    def send(self, subscription, message: NotificationMessage) -> DeliveryResult:
        """Deliver to a stored destination; never expose transport exceptions."""
