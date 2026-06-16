from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

def send_update_notification(investor, update):
    subject = f"New Update: {update.farm.name} — {update.title}"
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Adubiaro Farms <noreply@adubiaro.com>')
    to_email = [investor.email]

    # Email text body fallback
    text_content = f"""
    Hello {investor.get_full_name() or investor.username},

    A new operational status development has been posted for {update.farm.name}:
    Type: {update.get_update_type_display()}
    Title: {update.title}

    Summary:
    {update.body[:200]}...

    Please log in to your private investor portal to read complete logs and inspect photographs.
    """

    # HTML body styling
    html_content = f"""
    <h3>New Operations Update Released</h3>
    <p>Dear {investor.get_full_name() or investor.username},</p>
    <p>A new estate chronicle has been uploaded directly from the crop field:</p>
    <table style="padding: 10px; background-color: #F8F4EC; border-radius: 6px; width: 100%;">
      <tr><td><b>Estate farm:</b></td><td>{update.farm.name}</td></tr>
      <tr><td><b>Log Category:</b></td><td>{update.get_update_type_display()}</td></tr>
      <tr><td><b>Title:</b></td><td>{update.title}</td></tr>
    </table>
    <p style="margin-top:15px; font-style: italic; border-left: 3px solid #1B4332; padding-left: 10px;">
      "{update.body[:250]}..."
    </p>
    <p><a href="https://yourdomain.railway.app/accounts/login/" style="background-color:#1B4332;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Access Client Portal</a></p>
    """

    msg = EmailMultiAlternatives(subject, text_content, from_email, to_email)
    msg.attach_alternative(html_content, "text/html")
    msg.send(fail_silently=True)


def send_document_notification(investor, document):
    subject = f"New Document Available: {document.title}"
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Adubiaro Farms <noreply@adubiaro.com>')
    to_email = [investor.email]

    text_content = f"""
    Hello {investor.get_full_name() or investor.username},

    A secure proprietary document is ready regarding your farmland plot leases:
    Title: {document.title}
    Category: {document.get_category_display()}

    To safely download this document, please authenticate and log in to the portal.
    """

    html_content = f"""
    <h3>New Secure Document Uploaded</h3>
    <p>Dear {investor.get_full_name() or investor.username},</p>
    <p>A secure regulatory certificate or deed has been audited and compiled for your attention:</p>
    <table style="padding: 10px; background-color: #F8F4EC; border-radius: 6px; width: 100%;">
      <tr><td><b>Title:</b></td><td>{document.title}</td></tr>
      <tr><td><b>Category:</b></td><td>{document.get_category_display()}</td></tr>
      <tr><td><b>Estate:</b></td><td>{document.farm.name}</td></tr>
    </table>
    <p>Please click below to log in safely and access the document vault.</p>
    <p><a href="https://yourdomain.railway.app/accounts/login/" style="background-color:#1B4332;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Log in & Download File</a></p>
    """

    msg = EmailMultiAlternatives(subject, text_content, from_email, to_email)
    msg.attach_alternative(html_content, "text/html")
    msg.send(fail_silently=True)


def send_financial_notification(investor, summary):
    subject = f"Financial Summary Available: {summary.period} {summary.year} — Plot {summary.plot.plot_number}"
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Adubiaro Farms <noreply@adubiaro.com>')
    to_email = [investor.email]

    text_content = f"""
    Hello {investor.get_full_name() or investor.username},

    A quarterly payout statement ledger is now available for Plot {summary.plot.plot_number}:
    Amount: ${summary.payout_amount}
    Status: {summary.get_status_display()}
    Disburse due Date: {summary.payout_date}

    Log in to check the audit metrics.
    """

    html_content = f"""
    <h3>New Financial Statement audited</h3>
    <p>Dear {investor.get_full_name() or investor.username},</p>
    <p>A payout ledger has been published for your land holding plots:</p>
    <table style="padding: 10px; background-color: #F8F4EC; border-radius: 6px; width: 100%;">
      <tr><td><b>Plot ID:</b></td><td>{summary.plot.plot_number}</td></tr>
      <tr><td><b>Period:</b></td><td>{summary.period} {summary.year}</td></tr>
      <tr><td><b>ROI Audit:</b></td><td>{summary.roi_percentage}%</td></tr>
      <tr><td><b>Amount:</b></td><td><b>${summary.payout_amount}</b></td></tr>
      <tr><td><b>payment Status:</b></td><td>{summary.get_status_display()}</td></tr>
    </table>
    <p>To audit statement summaries or download certificates, log in to the investment ledger page.</p>
    <p><a href="https://yourdomain.railway.app/accounts/login/" style="background-color:#1B4332;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Review Ledger Payouts</a></p>
    """

    msg = EmailMultiAlternatives(subject, text_content, from_email, to_email)
    msg.attach_alternative(html_content, "text/html")
    msg.send(fail_silently=True)


def send_welcome_notification(user, temp_password):
    subject = "Welcome to Adubiaro Farm Estates Portal"
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Adubiaro Farms <noreply@adubiaro.com>')
    to_email = [user.email]

    text_content = f"""
    Hello {user.get_full_name() or user.username},

    Welcome to Adubiaro Farms! Your investor profile credentials has been setup:
    Authorized Username: {user.username}
    Temporary Password: {temp_password}

    Please click the URL to configure your profile.
    """

    html_content = f"""
    <h3>Welcome to Adubiaro Estate Private Client Portal</h3>
    <p>Dear {user.get_full_name() or user.username},</p>
    <p>An administrative client account has been securely setup for you:</p>
    <table style="padding: 10px; background-color: #F8F4EC; border-radius: 6px; width: 100%;">
      <tr><td><b>Authorized Username:</b></td><td>{user.username}</td></tr>
      <tr><td><b>Temporary password:</b></td><td><code>{temp_password}</code></td></tr>
    </table>
    <p>You are required to log in and change your password credentials inside your settings profile immediately.</p>
    <p><a href="https://yourdomain.railway.app/accounts/login/" style="background-color:#1B4332;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Access Login Portal</a></p>
    """

    msg = EmailMultiAlternatives(subject, text_content, from_email, to_email)
    msg.attach_alternative(html_content, "text/html")
    msg.send(fail_silently=True)
