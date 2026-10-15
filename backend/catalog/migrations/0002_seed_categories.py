from django.db import migrations

CATEGORIES = [
    ("Electronics", "electronics", "🎧"), ("Fashion", "fashion", "👕"), ("Home & Living", "home-living", "🛋️"),
    ("Beauty", "beauty", "💄"), ("Sports", "sports", "🏃"), ("Books", "books", "📚"),
    ("Toys", "toys", "🧸"), ("Grocery", "grocery", "🛒"),
]


def seed(apps, schema_editor):
    Category = apps.get_model("catalog", "Category")
    for name, slug, icon in CATEGORIES:
        Category.objects.get_or_create(slug=slug, defaults={"name": name, "icon": icon})


class Migration(migrations.Migration):
    dependencies = [("catalog", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
