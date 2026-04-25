from django.contrib import admin

from .models import Company, CompanyImage, CompanyVerification, Enquiry, MediaAsset, Product, ProductCategory, ProductImage

admin.site.register(Company)
admin.site.register(CompanyVerification)
admin.site.register(ProductCategory)
admin.site.register(Product)
admin.site.register(MediaAsset)
admin.site.register(CompanyImage)
admin.site.register(ProductImage)
admin.site.register(Enquiry)
