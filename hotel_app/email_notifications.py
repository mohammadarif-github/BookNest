"""
Email notification system for BookNest booking operations
Handles sending emails for booking confirmations, cancellations, and other operations
"""

from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.contrib.auth.models import User
from django.template.loader import render_to_string
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


def mask_email(email):
    """
    Mask email address for privacy (e.g., moh******45@gmail.com)
    """
    if not email or '@' not in email:
        return email
    
    local, domain = email.split('@', 1)
    if len(local) <= 3:
        return email
    
    masked_local = local[:3] + '*' * (len(local) - 5) + local[-2:] if len(local) > 5 else local[:1] + '*' * (len(local) - 1)
    return f"{masked_local}@{domain}"


def get_admin_and_manager_emails():
    """
    Get all admin and manager email addresses for notifications
    """
    emails = []
    
    # Get superusers (admins)
    admin_emails = User.objects.filter(
        is_superuser=True, 
        is_active=True,
        email__isnull=False
    ).exclude(email='').values_list('email', flat=True)
    emails.extend(admin_emails)
    
    # Get managers (users with booknest_role as manager or admin)
    try:
        from .models import UserRole
        manager_emails = User.objects.filter(
            booknest_role__role__in=['manager', 'admin'],
            booknest_role__is_active=True,
            is_active=True,
            email__isnull=False
        ).exclude(email='').values_list('email', flat=True)
        emails.extend(manager_emails)
    except:
        pass  # If UserRole doesn't exist or isn't set up yet
    
    # Remove duplicates
    return list(set(emails))


def send_booking_confirmation_email(booking):
    """
    Send booking confirmation email to customer and notify admins/managers
    """
    try:
        customer_email = booking.email or booking.customer.email
        if not customer_email:
            logger.warning(f"No email found for booking {booking.id}")
            return False

        # Prepare email data
        context = {
            'booking': booking,
            'customer_name': booking.customer.get_full_name() or booking.customer.username,
            'room_title': booking.room.title,
            'room_price': booking.room.price_per_night,
            'checking_date': booking.checking_date,
            'checkout_date': booking.checkout_date,
            'total_amount': booking.total_amount,
            'nights_count': booking.nights_count,
            'booking_id': booking.id,
        }

        # Customer email
        subject = f'Booking Confirmed - {booking.room.title} | BookNest'
        
        customer_html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h2 style="color: #28a745;">🏨 BookNest Room Booking</h2>
                <h3 style="color: #333;">Booking Confirmed!</h3>
                
                <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                    <p><strong>Congratulations! Your booking has been confirmed.</strong></p>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="color: #007bff; margin-top: 0;">Booking Details:</h4>
                    <p><strong>Booking ID:</strong> #{booking.id}</p>
                    <p><strong>Room:</strong> {booking.room.title}</p>
                    <p><strong>Guest:</strong> {context['customer_name']}</p>
                    <p><strong>Check-in:</strong> {booking.checking_date.strftime('%B %d, %Y at %I:%M %p') if booking.checking_date else 'TBD'}</p>
                    <p><strong>Check-out:</strong> {booking.checkout_date.strftime('%B %d, %Y at %I:%M %p') if booking.checkout_date else 'TBD'}</p>
                    <p><strong>Duration:</strong> {booking.nights_count or 1} night{'s' if booking.nights_count != 1 else ''}</p>
                    <p><strong>Total Amount:</strong> {booking.total_amount or booking.room.price_per_night} BDT</p>
                    <p><strong>Contact:</strong> {booking.phone_number}</p>
                </div>
                
                <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="margin-top: 0;">What's Next?</h4>
                    <ul>
                        <li>You will receive a payment confirmation shortly if payment is completed</li>
                        <li>Please arrive at BookNest 30 minutes before your check-in time</li>
                        <li>Bring a valid ID for verification</li>
                        <li>Contact us if you need to make any changes</li>
                    </ul>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                    If you have any questions, please contact our support team.
                </p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                
                <p style="color: #888; font-size: 12px;">
                    Best regards,<br>
                    BookNest Team
                </p>
            </div>
        </body>
        </html>
        """
        
        customer_plain_message = f"""
        BookNest - Booking Confirmed!

        Dear {context['customer_name']},

        Congratulations! Your booking has been confirmed.

        Booking Details:
        - Booking ID: #{booking.id}
        - Room: {booking.room.title}
        - Check-in: {booking.checking_date.strftime('%B %d, %Y at %I:%M %p') if booking.checking_date else 'TBD'}
        - Check-out: {booking.checkout_date.strftime('%B %d, %Y at %I:%M %p') if booking.checkout_date else 'TBD'}
        - Duration: {booking.nights_count or 1} night{'s' if booking.nights_count != 1 else ''}
        - Total Amount: {booking.total_amount or booking.room.price_per_night} BDT
        - Contact: {booking.phone_number}

        What's Next?
        - You will receive a payment confirmation shortly if payment is completed
        - Please arrive at the hotel 30 minutes before your check-in time
        - Bring a valid ID for verification
        - Contact us if you need to make any changes

        If you have any questions, please contact our support team.

        Best regards,
        BookNest Team
        """

        # Send to customer
        customer_msg = EmailMultiAlternatives(
            subject,
            customer_plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [customer_email]
        )
        customer_msg.attach_alternative(customer_html_message, "text/html")
        customer_msg.send(fail_silently=False)

        logger.info(f"Booking confirmation email sent to customer: {mask_email(customer_email)}")

        # Send notification to admins and managers
        admin_emails = get_admin_and_manager_emails()
        if admin_emails:
            admin_subject = f'New Booking Confirmed - #{booking.id} | {booking.room.title}'
            admin_html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #007bff;">🏨 BookNest Management Notification</h2>
                    <h3 style="color: #333;">New Booking Confirmed</h3>
                    
                    <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0c5460;">
                        <p><strong>A new booking has been confirmed and requires your attention.</strong></p>
                    </div>
                    
                    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="color: #007bff; margin-top: 0;">Booking Information:</h4>
                        <p><strong>Booking ID:</strong> #{booking.id}</p>
                        <p><strong>Room:</strong> {booking.room.title}</p>
                        <p><strong>Guest:</strong> {context['customer_name']}</p>
                        <p><strong>Email:</strong> {mask_email(customer_email)}</p>
                        <p><strong>Phone:</strong> {booking.phone_number}</p>
                        <p><strong>Check-in:</strong> {booking.checking_date.strftime('%B %d, %Y at %I:%M %p') if booking.checking_date else 'TBD'}</p>
                        <p><strong>Check-out:</strong> {booking.checkout_date.strftime('%B %d, %Y at %I:%M %p') if booking.checkout_date else 'TBD'}</p>
                        <p><strong>Total Amount:</strong> {booking.total_amount or booking.room.price_per_night} BDT</p>
                        <p><strong>Status:</strong> {booking.get_status_display()}</p>
                        <p><strong>Booking Date:</strong> {booking.booking_date.strftime('%B %d, %Y at %I:%M %p')}</p>
                    </div>
                    
                    <p style="color: #888; font-size: 12px;">
                        BookNest Management<br>
                        Automated Notification
                    </p>
                </div>
            </body>
            </html>
            """
            
            admin_plain_message = f"""
            BookNest Management Notification - New Booking Confirmed

            A new booking has been confirmed:

            Booking ID: #{booking.id}
            Room: {booking.room.title}
            Guest: {context['customer_name']}
            Email: {mask_email(customer_email)}
            Phone: {booking.phone_number}
            Check-in: {booking.checking_date.strftime('%B %d, %Y at %I:%M %p') if booking.checking_date else 'TBD'}
            Check-out: {booking.checkout_date.strftime('%B %d, %Y at %I:%M %p') if booking.checkout_date else 'TBD'}
            Total Amount: {booking.total_amount or booking.room.price_per_night} BDT
            Status: {booking.get_status_display()}
            Booking Date: {booking.booking_date.strftime('%B %d, %Y at %I:%M %p')}

            BookNest Management
            Automated Notification
            """

            admin_msg = EmailMultiAlternatives(
                admin_subject,
                admin_plain_message,
                settings.DEFAULT_FROM_EMAIL,
                admin_emails
            )
            admin_msg.attach_alternative(admin_html_message, "text/html")
            admin_msg.send(fail_silently=False)

            logger.info(f"Booking confirmation notification sent to {len(admin_emails)} admin(s)/manager(s)")

        return True

    except Exception as e:
        logger.error(f"Failed to send booking confirmation email for booking {booking.id}: {str(e)}")
        return False


def send_booking_cancellation_email(booking, cancellation_reason=None):
    """
    Send booking cancellation email to customer and notify admins/managers
    """
    try:
        customer_email = booking.email or booking.customer.email
        if not customer_email:
            logger.warning(f"No email found for booking {booking.id}")
            return False

        # Prepare email data
        context = {
            'booking': booking,
            'customer_name': booking.customer.get_full_name() or booking.customer.username,
            'room_title': booking.room.title,
            'cancellation_reason': cancellation_reason or booking.cancellation_reason or 'No reason provided',
        }

        # Customer email
        subject = f'Booking Cancelled - {booking.room.title} | BookNest'
        
        customer_html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h2 style="color: #dc3545;">🏨 BookNest</h2>
                <h3 style="color: #333;">Booking Cancelled</h3>
                
                <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
                    <p><strong>Your booking has been cancelled.</strong></p>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="color: #007bff; margin-top: 0;">Cancelled Booking Details:</h4>
                    <p><strong>Booking ID:</strong> #{booking.id}</p>
                    <p><strong>Room:</strong> {booking.room.title}</p>
                    <p><strong>Guest:</strong> {context['customer_name']}</p>
                    <p><strong>Original Check-in:</strong> {booking.checking_date.strftime('%B %d, %Y at %I:%M %p') if booking.checking_date else 'TBD'}</p>
                    <p><strong>Original Check-out:</strong> {booking.checkout_date.strftime('%B %d, %Y at %I:%M %p') if booking.checkout_date else 'TBD'}</p>
                    <p><strong>Cancellation Reason:</strong> {context['cancellation_reason']}</p>
                    <p><strong>Cancelled On:</strong> {timezone.now().strftime('%B %d, %Y at %I:%M %p')}</p>
                </div>
                
                <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="margin-top: 0;">Refund Information:</h4>
                    <p>If you made a payment, our team will process your refund according to our cancellation policy. You will receive a separate email with refund details within 24-48 hours.</p>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                    We're sorry to see your booking cancelled. If you have any questions or would like to make a new booking, please contact our support team.
                </p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                
                <p style="color: #888; font-size: 12px;">
                    Best regards,<br>
                    BookNest Team
                </p>
            </div>
        </body>
        </html>
        """
        
        customer_plain_message = f"""
        BookNest - Booking Cancelled

        Dear {context['customer_name']},

        Your booking has been cancelled.

        Cancelled Booking Details:
        - Booking ID: #{booking.id}
        - Room: {booking.room.title}
        - Original Check-in: {booking.checking_date.strftime('%B %d, %Y at %I:%M %p') if booking.checking_date else 'TBD'}
        - Original Check-out: {booking.checkout_date.strftime('%B %d, %Y at %I:%M %p') if booking.checkout_date else 'TBD'}
        - Cancellation Reason: {context['cancellation_reason']}
        - Cancelled On: {timezone.now().strftime('%B %d, %Y at %I:%M %p')}

        Refund Information:
        If you made a payment, our team will process your refund according to our cancellation policy. You will receive a separate email with refund details within 24-48 hours.

        We're sorry to see your booking cancelled. If you have any questions or would like to make a new booking, please contact our support team.

        Best regards,
        BookNest Team
        """

        # Send to customer
        customer_msg = EmailMultiAlternatives(
            subject,
            customer_plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [customer_email]
        )
        customer_msg.attach_alternative(customer_html_message, "text/html")
        customer_msg.send(fail_silently=False)

        logger.info(f"Booking cancellation email sent to customer: {mask_email(customer_email)}")

        # Send notification to admins and managers
        admin_emails = get_admin_and_manager_emails()
        if admin_emails:
            admin_subject = f'Booking Cancelled - #{booking.id} | {booking.room.title}'
            admin_html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #dc3545;">🏨 BookNest Management Notification</h2>
                    <h3 style="color: #333;">Booking Cancelled</h3>
                    
                    <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
                        <p><strong>A booking has been cancelled and may require your attention.</strong></p>
                    </div>
                    
                    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="color: #007bff; margin-top: 0;">Cancelled Booking Information:</h4>
                        <p><strong>Booking ID:</strong> #{booking.id}</p>
                        <p><strong>Room:</strong> {booking.room.title}</p>
                        <p><strong>Guest:</strong> {context['customer_name']}</p>
                        <p><strong>Email:</strong> {mask_email(customer_email)}</p>
                        <p><strong>Phone:</strong> {booking.phone_number}</p>
                        <p><strong>Original Check-in:</strong> {booking.checking_date.strftime('%B %d, %Y at %I:%M %p') if booking.checking_date else 'TBD'}</p>
                        <p><strong>Original Check-out:</strong> {booking.checkout_date.strftime('%B %d, %Y at %I:%M %p') if booking.checkout_date else 'TBD'}</p>
                        <p><strong>Cancellation Reason:</strong> {context['cancellation_reason']}</p>
                        <p><strong>Cancelled On:</strong> {timezone.now().strftime('%B %d, %Y at %I:%M %p')}</p>
                        <p><strong>Total Amount:</strong> {booking.total_amount or booking.room.price_per_night} BDT</p>
                    </div>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #856404;">
                        <p><strong>Action Required:</strong> Please review if any refund processing is needed.</p>
                    </div>
                    
                    <p style="color: #888; font-size: 12px;">
                        BookNest Management<br>
                        Automated Notification
                    </p>
                </div>
            </body>
            </html>
            """

            admin_msg = EmailMultiAlternatives(
                admin_subject,
                f"""
                BookNest Management Notification - Booking Cancelled

                A booking has been cancelled:

                Booking ID: #{booking.id}
                Room: {booking.room.title}
                Guest: {context['customer_name']}
                Email: {mask_email(customer_email)}
                Phone: {booking.phone_number}
                Original Check-in: {booking.checking_date.strftime('%B %d, %Y at %I:%M %p') if booking.checking_date else 'TBD'}
                Original Check-out: {booking.checkout_date.strftime('%B %d, %Y at %I:%M %p') if booking.checkout_date else 'TBD'}
                Cancellation Reason: {context['cancellation_reason']}
                Cancelled On: {timezone.now().strftime('%B %d, %Y at %I:%M %p')}
                Total Amount: {booking.total_amount or booking.room.price_per_night} BDT

                Action Required: Please review if any refund processing is needed.

                BookNest Management
                Automated Notification
                """,
                settings.DEFAULT_FROM_EMAIL,
                admin_emails
            )
            admin_msg.attach_alternative(admin_html_message, "text/html")
            admin_msg.send(fail_silently=False)

            logger.info(f"Booking cancellation notification sent to {len(admin_emails)} admin(s)/manager(s)")

        return True

    except Exception as e:
        logger.error(f"Failed to send booking cancellation email for booking {booking.id}: {str(e)}")
        return False


def send_payment_confirmation_email(booking, payment):
    """
    Send payment confirmation email to customer and notify admins/managers
    """
    try:
        customer_email = booking.email or booking.customer.email
        if not customer_email:
            logger.warning(f"No email found for booking {booking.id}")
            return False

        # Prepare email data
        context = {
            'booking': booking,
            'payment': payment,
            'customer_name': booking.customer.get_full_name() or booking.customer.username,
            'room_title': booking.room.title,
        }

        # Customer email
        subject = f'Payment Confirmed - {booking.room.title} | BookNest'
        
        customer_html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h2 style="color: #28a745;">🏨 BookNest</h2>
                <h3 style="color: #333;">Payment Confirmed!</h3>
                
                <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                    <p><strong>Great! Your payment has been successfully processed.</strong></p>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="color: #007bff; margin-top: 0;">Payment Details:</h4>
                    <p><strong>Transaction ID:</strong> {payment.transaction_id}</p>
                    <p><strong>Amount Paid:</strong> {payment.amount} {payment.currency}</p>
                    <p><strong>Payment Method:</strong> {payment.payment_method}</p>
                    <p><strong>Payment Date:</strong> {payment.paid_at.strftime('%B %d, %Y at %I:%M %p') if payment.paid_at else 'Just now'}</p>
                    <p><strong>Status:</strong> {payment.get_status_display()}</p>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
                    <h4 style="color: #007bff; margin-top: 0;">Booking Information:</h4>
                    <p><strong>Booking ID:</strong> #{booking.id}</p>
                    <p><strong>Room:</strong> {booking.room.title}</p>
                    <p><strong>Check-in:</strong> {booking.checking_date.strftime('%B %d, %Y at %I:%M %p') if booking.checking_date else 'TBD'}</p>
                    <p><strong>Check-out:</strong> {booking.checkout_date.strftime('%B %d, %Y at %I:%M %p') if booking.checkout_date else 'TBD'}</p>
                    <p><strong>Duration:</strong> {booking.nights_count or 1} night{'s' if booking.nights_count != 1 else ''}</p>
                </div>
                
                <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="margin-top: 0;">Your Reservation is Confirmed!</h4>
                    <p>With your payment completed, your room reservation is now fully confirmed. We look forward to welcoming you!</p>
                    <ul>
                        <li>Please arrive 30 minutes before your check-in time</li>
                        <li>Bring a valid ID for verification</li>
                        <li>Keep this email as proof of payment</li>
                    </ul>
                </div>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                
                <p style="color: #888; font-size: 12px;">
                    Best regards,<br>
                    BookNest Team
                </p>
            </div>
        </body>
        </html>
        """
        
        customer_plain_message = f"""
        BookNest - Payment Confirmed!

        Dear {context['customer_name']},

        Great! Your payment has been successfully processed.

        Payment Details:
        - Transaction ID: {payment.transaction_id}
        - Amount Paid: {payment.amount} {payment.currency}
        - Payment Method: {payment.payment_method}
        - Payment Date: {payment.paid_at.strftime('%B %d, %Y at %I:%M %p') if payment.paid_at else 'Just now'}
        - Status: {payment.get_status_display()}

        Booking Information:
        - Booking ID: #{booking.id}
        - Room: {booking.room.title}
        - Check-in: {booking.checking_date.strftime('%B %d, %Y at %I:%M %p') if booking.checking_date else 'TBD'}
        - Check-out: {booking.checkout_date.strftime('%B %d, %Y at %I:%M %p') if booking.checkout_date else 'TBD'}
        - Duration: {booking.nights_count or 1} night{'s' if booking.nights_count != 1 else ''}

        Your Reservation is Confirmed!
        With your payment completed, your room reservation is now fully confirmed. We look forward to welcoming you!

        - Please arrive 30 minutes before your check-in time
        - Bring a valid ID for verification  
        - Keep this email as proof of payment

        Best regards,
        BookNest Team
        """

        # Send to customer
        customer_msg = EmailMultiAlternatives(
            subject,
            customer_plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [customer_email]
        )
        customer_msg.attach_alternative(customer_html_message, "text/html")
        customer_msg.send(fail_silently=False)

        logger.info(f"Payment confirmation email sent to customer: {mask_email(customer_email)}")

        # Send notification to admins and managers
        admin_emails = get_admin_and_manager_emails()
        if admin_emails:
            admin_subject = f'Payment Received - #{booking.id} | {payment.amount} {payment.currency}'
            admin_html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #28a745;">🏨 BookNest Management Notification</h2>
                    <h3 style="color: #333;">Payment Received</h3>
                    
                    <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <p><strong>A payment has been successfully processed.</strong></p>
                    </div>
                    
                    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="color: #007bff; margin-top: 0;">Payment Information:</h4>
                        <p><strong>Transaction ID:</strong> {payment.transaction_id}</p>
                        <p><strong>Booking ID:</strong> #{booking.id}</p>
                        <p><strong>Room:</strong> {booking.room.title}</p>
                        <p><strong>Customer:</strong> {context['customer_name']}</p>
                        <p><strong>Email:</strong> {mask_email(customer_email)}</p>
                        <p><strong>Amount:</strong> {payment.amount} {payment.currency}</p>
                        <p><strong>Payment Method:</strong> {payment.payment_method}</p>
                        <p><strong>Payment Date:</strong> {payment.paid_at.strftime('%B %d, %Y at %I:%M %p') if payment.paid_at else 'Just now'}</p>
                        <p><strong>Status:</strong> {payment.get_status_display()}</p>
                    </div>
                    
                    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
                        <h4 style="color: #007bff; margin-top: 0;">Booking Details:</h4>
                        <p><strong>Check-in:</strong> {booking.checking_date.strftime('%B %d, %Y at %I:%M %p') if booking.checking_date else 'TBD'}</p>
                        <p><strong>Check-out:</strong> {booking.checkout_date.strftime('%B %d, %Y at %I:%M %p') if booking.checkout_date else 'TBD'}</p>
                        <p><strong>Duration:</strong> {booking.nights_count or 1} night{'s' if booking.nights_count != 1 else ''}</p>
                        <p><strong>Phone:</strong> {booking.phone_number}</p>
                    </div>
                    
                    <p style="color: #888; font-size: 12px;">
                        BookNest Management<br>
                        Automated Notification
                    </p>
                </div>
            </body>
            </html>
            """

            admin_msg = EmailMultiAlternatives(
                admin_subject,
                f"""
                BookNest Management Notification - Payment Received

                A payment has been successfully processed:

                Transaction ID: {payment.transaction_id}
                Booking ID: #{booking.id}
                Room: {booking.room.title}
                Customer: {context['customer_name']}
                Email: {mask_email(customer_email)}
                Amount: {payment.amount} {payment.currency}
                Payment Method: {payment.payment_method}
                Payment Date: {payment.paid_at.strftime('%B %d, %Y at %I:%M %p') if payment.paid_at else 'Just now'}
                Status: {payment.get_status_display()}

                Booking Details:
                Check-in: {booking.checking_date.strftime('%B %d, %Y at %I:%M %p') if booking.checking_date else 'TBD'}
                Check-out: {booking.checkout_date.strftime('%B %d, %Y at %I:%M %p') if booking.checkout_date else 'TBD'}
                Duration: {booking.nights_count or 1} night{'s' if booking.nights_count != 1 else ''}
                Phone: {booking.phone_number}

                BookNest Management
                Automated Notification
                """,
                settings.DEFAULT_FROM_EMAIL,
                admin_emails
            )
            admin_msg.attach_alternative(admin_html_message, "text/html")
            admin_msg.send(fail_silently=False)

            logger.info(f"Payment confirmation notification sent to {len(admin_emails)} admin(s)/manager(s)")

        return True

    except Exception as e:
        logger.error(f"Failed to send payment confirmation email for booking {booking.id}: {str(e)}")
        return False
