from django.contrib import admin

from .models import (
    Company,
    CompanyImage,
    CompanyTier,
    CompanyVerification,
    Enquiry,
    MediaAsset,
    Product,
    ProductAttributeDefinition,
    ProductAttributeValue,
    ProductCategory,
    ProductImage,
    ProductSubCategory,
)

admin.site.register(CompanyTier)
admin.site.register(Company)
admin.site.register(CompanyVerification)
admin.site.register(ProductCategory)
admin.site.register(ProductSubCategory)
admin.site.register(ProductAttributeDefinition)
admin.site.register(Product)
admin.site.register(ProductAttributeValue)
admin.site.register(MediaAsset)
admin.site.register(CompanyImage)
admin.site.register(ProductImage)
admin.site.register(Enquiry)
