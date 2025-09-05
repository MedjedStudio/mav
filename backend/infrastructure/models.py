from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, UniqueConstraint, ForeignKey, Table, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


# 中間テーブル（コンテンツとカテゴリの多対多関係）
content_categories = Table(
    'content_categories', Base.metadata,
    Column('content_id', Integer, ForeignKey('contents.id'), primary_key=True),
    Column('category_id', Integer, ForeignKey('categories.id'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)

class UserRole(enum.IntEnum):
    ADMIN = 1
    MEMBER = 2

class UserTimezone(enum.IntEnum):
    # UTC
    UTC = 1                          # UTC+0
    
    # Americas
    AMERICA_NEW_YORK = 2             # UTC-5/-4 (EST/EDT)
    AMERICA_CHICAGO = 3              # UTC-6/-5 (CST/CDT)
    AMERICA_DENVER = 4               # UTC-7/-6 (MST/MDT)
    AMERICA_LOS_ANGELES = 5          # UTC-8/-7 (PST/PDT)
    AMERICA_ANCHORAGE = 6            # UTC-9/-8 (AKST/AKDT)
    AMERICA_HONOLULU = 7             # UTC-10 (HST)
    AMERICA_TORONTO = 8              # UTC-5/-4 (EST/EDT)
    AMERICA_VANCOUVER = 9            # UTC-8/-7 (PST/PDT)
    AMERICA_MEXICO_CITY = 10         # UTC-6/-5 (CST/CDT)
    AMERICA_SAO_PAULO = 11           # UTC-3/-2 (BRT/BRST)
    AMERICA_BUENOS_AIRES = 12        # UTC-3 (ART)
    AMERICA_LIMA = 13                # UTC-5 (PET)
    AMERICA_BOGOTA = 14              # UTC-5 (COT)
    AMERICA_CARACAS = 15             # UTC-4 (VET)
    AMERICA_SANTIAGO = 16            # UTC-4/-3 (CLT/CLST)
    
    # Europe
    EUROPE_LONDON = 17               # UTC+0/+1 (GMT/BST)
    EUROPE_PARIS = 18                # UTC+1/+2 (CET/CEST)
    EUROPE_BERLIN = 19               # UTC+1/+2 (CET/CEST)
    EUROPE_MADRID = 20               # UTC+1/+2 (CET/CEST)
    EUROPE_ROME = 21                 # UTC+1/+2 (CET/CEST)
    EUROPE_AMSTERDAM = 22            # UTC+1/+2 (CET/CEST)
    EUROPE_ZURICH = 23               # UTC+1/+2 (CET/CEST)
    EUROPE_VIENNA = 24               # UTC+1/+2 (CET/CEST)
    EUROPE_STOCKHOLM = 25            # UTC+1/+2 (CET/CEST)
    EUROPE_OSLO = 26                 # UTC+1/+2 (CET/CEST)
    EUROPE_COPENHAGEN = 27           # UTC+1/+2 (CET/CEST)
    EUROPE_HELSINKI = 28             # UTC+2/+3 (EET/EEST)
    EUROPE_MOSCOW = 29               # UTC+3 (MSK)
    EUROPE_WARSAW = 30               # UTC+1/+2 (CET/CEST)
    EUROPE_PRAGUE = 31               # UTC+1/+2 (CET/CEST)
    EUROPE_BUDAPEST = 32             # UTC+1/+2 (CET/CEST)
    EUROPE_BUCHAREST = 33            # UTC+2/+3 (EET/EEST)
    EUROPE_ATHENS = 34               # UTC+2/+3 (EET/EEST)
    EUROPE_ISTANBUL = 35             # UTC+3 (TRT)
    EUROPE_KIEV = 36                 # UTC+2/+3 (EET/EEST)
    
    # Asia
    ASIA_TOKYO = 37                  # UTC+9 (JST)
    ASIA_SEOUL = 38                  # UTC+9 (KST)
    ASIA_SHANGHAI = 39               # UTC+8 (CST)
    ASIA_BEIJING = 40                # UTC+8 (CST)
    ASIA_HONG_KONG = 41              # UTC+8 (HKT)
    ASIA_TAIPEI = 42                 # UTC+8 (CST)
    ASIA_SINGAPORE = 43              # UTC+8 (SGT)
    ASIA_KUALA_LUMPUR = 44           # UTC+8 (MYT)
    ASIA_JAKARTA = 45                # UTC+7 (WIB)
    ASIA_BANGKOK = 46                # UTC+7 (ICT)
    ASIA_HO_CHI_MINH = 47            # UTC+7 (ICT)
    ASIA_MANILA = 48                 # UTC+8 (PHT)
    ASIA_DHAKA = 49                  # UTC+6 (BST)
    ASIA_KOLKATA = 50                # UTC+5:30 (IST)
    ASIA_KARACHI = 51                # UTC+5 (PKT)
    ASIA_TASHKENT = 52               # UTC+5 (UZT)
    ASIA_DUBAI = 53                  # UTC+4 (GST)
    ASIA_TEHRAN = 54                 # UTC+3:30/+4:30 (IRST/IRDT)
    ASIA_RIYADH = 55                 # UTC+3 (AST)
    ASIA_KUWAIT = 56                 # UTC+3 (AST)
    ASIA_DOHA = 57                   # UTC+3 (AST)
    ASIA_MUSCAT = 58                 # UTC+4 (GST)
    ASIA_BAKU = 59                   # UTC+4 (AZT)
    ASIA_YEREVAN = 60                # UTC+4 (AMT)
    ASIA_TBILISI = 61                # UTC+4 (GET)
    ASIA_ALMATY = 62                 # UTC+6 (ALMT)
    ASIA_NOVOSIBIRSK = 63            # UTC+7 (NOVT)
    ASIA_KRASNOYARSK = 64            # UTC+7 (KRAT)
    ASIA_IRKUTSK = 65                # UTC+8 (IRKT)
    ASIA_YAKUTSK = 66                # UTC+9 (YAKT)
    ASIA_VLADIVOSTOK = 67            # UTC+10 (VLAT)
    ASIA_MAGADAN = 68                # UTC+11 (MAGT)
    
    # Africa
    AFRICA_CAIRO = 69                # UTC+2/+3 (EET/EEST)
    AFRICA_JOHANNESBURG = 70         # UTC+2 (SAST)
    AFRICA_NAIROBI = 71              # UTC+3 (EAT)
    AFRICA_LAGOS = 72                # UTC+1 (WAT)
    AFRICA_CASABLANCA = 73           # UTC+0/+1 (WET/WEST)
    AFRICA_ALGIERS = 74              # UTC+1 (CET)
    AFRICA_TUNIS = 75                # UTC+1 (CET)
    AFRICA_ADDIS_ABABA = 76          # UTC+3 (EAT)
    AFRICA_DAR_ES_SALAAM = 77        # UTC+3 (EAT)
    AFRICA_ACCRA = 78                # UTC+0 (GMT)
    AFRICA_ABIDJAN = 79              # UTC+0 (GMT)
    
    # Australia & Oceania
    AUSTRALIA_SYDNEY = 80            # UTC+10/+11 (AEST/AEDT)
    AUSTRALIA_MELBOURNE = 81         # UTC+10/+11 (AEST/AEDT)
    AUSTRALIA_BRISBANE = 82          # UTC+10 (AEST)
    AUSTRALIA_PERTH = 83             # UTC+8 (AWST)
    AUSTRALIA_ADELAIDE = 84          # UTC+9:30/+10:30 (ACST/ACDT)
    AUSTRALIA_DARWIN = 85            # UTC+9:30 (ACST)
    PACIFIC_AUCKLAND = 86            # UTC+12/+13 (NZST/NZDT)
    PACIFIC_FIJI = 87                # UTC+12/+13 (FJT/FJST)
    PACIFIC_TAHITI = 88              # UTC-10 (TAHT)
    PACIFIC_HONOLULU = 89            # UTC-10 (HST)
    PACIFIC_GUAM = 90                # UTC+10 (ChST)
    
    # Additional zones
    ATLANTIC_AZORES = 91             # UTC-1/+0 (AZOT/AZOST)
    ATLANTIC_CAPE_VERDE = 92         # UTC-1 (CVT)
    INDIAN_MALDIVES = 93             # UTC+5 (MVT)
    INDIAN_MAURITIUS = 94            # UTC+4 (MUT)

class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), index=True, nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Integer, default=UserRole.MEMBER, nullable=False)
    profile = Column(Text, nullable=True)
    timezone = Column(Integer, default=UserTimezone.UTC, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # リレーション
    avatar = relationship("AvatarModel", back_populates="user", uselist=False)

    __table_args__ = (
        UniqueConstraint('email', 'deleted_at', name='uq_email_deleted_at'),
    )

class CategoryModel(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0, server_default='0')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # リレーション（多対多）
    contents = relationship("ContentModel", secondary=content_categories, back_populates="categories")

class ContentModel(Base):
    __tablename__ = "contents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)
    author_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # カテゴリとの多対多リレーション
    categories = relationship("CategoryModel", secondary=content_categories, back_populates="contents")

class FileModel(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    uploaded_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # リレーション
    uploader = relationship("UserModel")

class AvatarModel(Base):
    __tablename__ = "avatars"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint('user_id', 'deleted_at', name='uq_user_avatar_active'),
    )

    # リレーション
    user = relationship("UserModel", back_populates="avatar")