from datetime import datetime, timezone

from sqlalchemy import event
from sqlalchemy.orm import Session, with_loader_criteria

from .. import db


class SoftDeleteMixin:
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True, index=True)

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        self.deleted_at = datetime.now(timezone.utc)

    def restore(self) -> None:
        self.deleted_at = None


@event.listens_for(Session, "do_orm_execute")
def _filter_soft_deleted(execute_state):
    if not execute_state.is_select:
        return
    if execute_state.execution_options.get("include_deleted", False):
        return

    execute_state.statement = execute_state.statement.options(
        with_loader_criteria(
            SoftDeleteMixin,
            lambda cls: cls.deleted_at.is_(None),
            include_aliases=True,
        )
    )
