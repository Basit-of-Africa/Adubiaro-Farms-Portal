from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date
from farms.models import Farm, FarmPlot, InvestorPlot, FarmManagerAssignment, PlotStatus
from updates.models import FarmUpdate
from documents.models import Document, DocumentCategory, DocumentVisibility
from financials.models import FinancialSummary, FinancialStatus

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds initial demonstration data for Adubiaro Farms Client Portal'

    def handle(self, *args, **options):
        self.stdout.write('Starting seeding process...')

        # 1. Create Users
        # Super Admin
        admin_user, created = User.objects.get_or_create(
            username='ajibade_admin',
            email='ajibadebasit40@gmail.com',
            defaults={
                'first_name': 'Basit',
                'last_name': 'Ajibade',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
                'phone': '+234800100200'
            }
        )
        if created:
            admin_user.set_password('Admin@1234')
            admin_user.save()
            self.stdout.write('Super Admin user created.')

        # Farm Manager
        manager_user, created = User.objects.get_or_create(
            username='manager_tunde',
            email='tunde@adubiaro.com',
            defaults={
                'first_name': 'Tunde',
                'last_name': 'Olowo',
                'role': 'farm_manager',
                'phone': '+234811222333'
            }
        )
        if created:
            manager_user.set_password('Manager@1234')
            manager_user.save()
            self.stdout.write('Farm Manager user created.')

        # Investor
        investor_user, created = User.objects.get_or_create(
            username='investor_john',
            email='john@investor.com',
            defaults={
                'first_name': 'John',
                'last_name': 'Doe',
                'role': 'investor',
                'phone': '+14155552671'
            }
        )
        if created:
            investor_user.set_password('Investor@1234')
            investor_user.save()
            self.stdout.write('Investor user created.')

        # 2. Create Farms
        farm_ogun, created = Farm.objects.get_or_create(
            name='Ota Oil Palm Estate',
            defaults={
                'location': 'Ota District',
                'state': 'Ogun State',
                'total_plots': 20,
                'total_hectares': 45.5,
                'description': 'Premium high-density Tenera oil palm development. Featuring custom subterranean irrigation networks and certified milling capabilities nearby.',
                'date_established': date(2021, 6, 15)
            }
        )
        if created:
            self.stdout.write('Ota Oil Palm Estate created.')

        # 3. Create Plots
        plot_a01, created = FarmPlot.objects.get_or_create(
            farm=farm_ogun,
            plot_number='A-01',
            defaults={
                'size_hectares': 2.5,
                'crop_type': 'Tenera Hybrid Oil Palm',
                'status': PlotStatus.ACTIVE
            }
        )
        
        plot_a02, created = FarmPlot.objects.get_or_create(
            farm=farm_ogun,
            plot_number='A-02',
            defaults={
                'size_hectares': 3.0,
                'crop_type': 'Tenera Hybrid Oil Palm',
                'status': PlotStatus.HARVESTING
            }
        )

        # 4. Assign Manager
        assignment, created = FarmManagerAssignment.objects.get_or_create(
            manager=manager_user,
            farm=farm_ogun,
            defaults={'is_active': True}
        )

        # 5. Assign Investor to Plot A-01
        investment, created = InvestorPlot.objects.get_or_create(
            investor=investor_user,
            plot=plot_a01,
            defaults={
                'investment_amount': 25000.00,
                'ownership_percentage': 100.00,
                'start_date': date(2022, 1, 10),
                'contract_ref': 'ADU-OUN-A01'
            }
        )

        # 6. Post Operational Update
        update, created = FarmUpdate.objects.get_or_create(
            farm=farm_ogun,
            title='Ota Harvesting Phase Complete',
            defaults={
                'posted_by': manager_user,
                'body': 'Harvest cycle for Block A completed smoothly. Bulk trucks have transported the raw palm kernels to the main processing mill. Mean crude seed yield is up 12% over Q3 forecasts.',
                'update_type': 'harvest',
                'is_published': True
            }
        )

        # 7. Upload Secured Document
        doc, created = Document.objects.get_or_create(
            farm=farm_ogun,
            title='Covenant of Certified Seed Allocation (A-01)',
            defaults={
                'plot': plot_a01,
                'uploaded_by': admin_user,
                'category': DocumentCategory.CERTIFICATE,
                'visibility': DocumentVisibility.PLOT,
                'description': 'Notarized seed boundary survey and legal title allocation deed details for plot sector A-01.'
            }
        )

        # 8. Add Financial Record
        fin_rec, created = FinancialSummary.objects.get_or_create(
            plot=plot_a01,
            period='Q3',
            year=2024,
            defaults={
                'uploaded_by': admin_user,
                'roi_percentage': 8.50,
                'payout_amount': 2125.00,
                'payout_date': date(2024, 10, 15),
                'status': FinancialStatus.PAID,
                'notes': 'Disbursed successfully via Standard Wire Transfer. Audited by G. Shoyombo & Co.'
            }
        )

        self.stdout.write(self.style.SUCCESS('Demonstration database successfully seeded!'))
