from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from updates.models import FarmUpdate
from documents.models import Document
from financials.models import FinancialSummary
from farms.models import InvestorPlot, FarmPlot

from .emails import (
    send_update_notification,
    send_document_notification,
    send_financial_notification,
    send_welcome_notification
)

User = get_user_model()

@receiver(post_save, sender=FarmUpdate)
def trigger_update_email(sender, instance, created, **kwargs):
    if created and instance.is_published:
        # Get all investors on this farm
        plots = FarmPlot.objects.filter(farm=instance.farm)
        investor_ids = InvestorPlot.objects.filter(
            plot__in=plots,
            is_active=True
        ).values_list('investor_id', flat=True).distinct()
        
        investors = User.objects.filter(id__in=investor_ids, role='investor')
        for investor in investors:
            send_update_notification(investor, instance)


@receiver(post_save, sender=Document)
def trigger_document_email(sender, instance, created, **kwargs):
    if created:
        if instance.visibility == 'plot' and instance.plot:
            # Send ONLY to specific plot owner
            ownerships = InvestorPlot.objects.filter(plot=instance.plot, is_active=True)
            for owner in ownerships:
                if owner.investor.role == 'investor':
                    send_document_notification(owner.investor, instance)
        else:
            # Send to ALL owners on this farm
            plots = FarmPlot.objects.filter(farm=instance.farm)
            investor_ids = InvestorPlot.objects.filter(
                plot__in=plots,
                is_active=True
            ).values_list('investor_id', flat=True).distinct()
            
            investors = User.objects.filter(id__in=investor_ids, role='investor')
            for investor in investors:
                send_document_notification(investor, instance)


@receiver(post_save, sender=FinancialSummary)
def trigger_financial_email(sender, instance, created, **kwargs):
    if created:
        # Trigger email to the specific plot owner
        ownerships = InvestorPlot.objects.filter(plot=instance.plot, is_active=True)
        for owner in ownerships:
            if owner.investor.role == 'investor':
                send_financial_notification(owner.investor, instance)


@receiver(post_save, sender=User)
def trigger_welcome_email(sender, instance, created, **kwargs):
    if created and instance.role == 'investor':
        # Trigger welcome notification with temporary credentials
        temp_pass = "Investor@1234" # standard seed password
        send_welcome_notification(instance, temp_pass)
 Muse
