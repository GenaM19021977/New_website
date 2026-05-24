from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0019_userquestion_answer_email_sent_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="google_id",
            field=models.CharField(
                blank=True,
                help_text="Идентификатор пользователя в Google (sub из ID token)",
                max_length=255,
                null=True,
                unique=True,
                verbose_name="Google ID",
            ),
        ),
    ]
