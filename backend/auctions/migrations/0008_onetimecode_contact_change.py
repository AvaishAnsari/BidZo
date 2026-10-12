from django.db import migrations, models


def mark_existing_registration_phones_verified(apps, schema_editor):
    UserProfile = apps.get_model('auctions', 'UserProfile')
    UserProfile.objects.exclude(phone_number__isnull=True).exclude(phone_number='').update(phone_verified=True)


class Migration(migrations.Migration):

    dependencies = [
        ('auctions', '0007_auctionpayment_notification_watchlistitem'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='email_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='phone_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(mark_existing_registration_phones_verified, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='onetimecode',
            name='purpose',
            field=models.CharField(
                choices=[
                    ('login', 'Login'),
                    ('phone_registration', 'Phone registration'),
                    ('contact_change', 'Contact change'),
                ],
                default='login',
                max_length=24,
            ),
        ),
    ]
