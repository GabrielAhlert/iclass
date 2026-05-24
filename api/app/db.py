from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=1800,
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    await seed_admin()


async def seed_admin() -> None:
    from app.models import Usuario, TipoUsuario
    from app.core.security import hash_password

    async with AsyncSessionLocal() as session:
        result = await session.exec(select(Usuario).where(Usuario.email == "admin@admin.com"))
        if result.first():
            return
        session.add(Usuario(
            nome="Admin",
            email="admin@admin.com",
            senha_hash=hash_password("teste123"),
            tipo=TipoUsuario.admin,
            primeiro_acesso=False,
        ))
        await session.commit()


async def get_session():
    async with AsyncSessionLocal() as session:
        yield session
