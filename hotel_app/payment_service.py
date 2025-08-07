"""
SSLCommerz Payment Gateway Service
Handles all SSLCommerz API interactions for the BookNest Room Booking System
"""

import requests
import json
import hashlib
import uuid
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from .models import Payment, Booking
from .email_notifications import send_payment_confirmation_email
import logging

logger = logging.getLogger(__name__)

class SSLCommerzService:
    """
    SSLCommerz Payment Gateway Integration Service
    """
    
    def __init__(self):
        # SSLCommerz Sandbox Configuration
        self.store_id = "nestb689199e3a6b15"
        self.store_password = "nestb689199e3a6b15@ssl"
        self.base_url = "https://sandbox.sslcommerz.com"
        
        # URLs for callbacks (will be updated for production)
        self.success_url = "http://localhost:8000/hotel/payment/success/"
        self.fail_url = "http://localhost:8000/hotel/payment/fail/"
        self.cancel_url = "http://localhost:8000/hotel/payment/cancel/"
        self.ipn_url = "http://localhost:8000/hotel/payment/ipn/"
        
    def generate_transaction_id(self, booking_id):
        """Generate unique transaction ID for booking"""
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        return f"HTL{booking_id}{timestamp}{unique_id}"
    
    def initiate_payment(self, booking_id, amount, customer_info):
        """
        Initiate payment with SSLCommerz
        
        Args:
            booking_id (int): Booking ID
            amount (Decimal): Payment amount
            customer_info (dict): Customer information
            
        Returns:
            dict: Payment initiation response
        """
        try:
            # Get booking
            booking = Booking.objects.get(id=booking_id)
            
            # Check if payment already exists
            try:
                payment = Payment.objects.get(booking=booking)
                
                # If payment is already successful, return error
                if payment.is_successful:
                    return {
                        'success': False,
                        'error': 'Payment already completed for this booking',
                        'details': f'Payment {payment.transaction_id} is already successful'
                    }
                
                # If payment is pending and not too old, reuse the existing transaction
                if payment.status == 'pending':
                    # Check if payment is recent (within last 30 minutes)
                    time_diff = timezone.now() - payment.created_at
                    if time_diff.total_seconds() < 1800:  # 30 minutes
                        # Reuse existing payment record
                        transaction_id = payment.transaction_id
                    else:
                        # Update the existing payment for new attempt
                        transaction_id = self.generate_transaction_id(booking_id)
                        payment.transaction_id = transaction_id
                        payment.amount = amount
                        payment.status = 'pending'
                        payment.save()
                else:
                    # For failed/cancelled payments, create new transaction ID
                    transaction_id = self.generate_transaction_id(booking_id)
                    payment.transaction_id = transaction_id
                    payment.amount = amount
                    payment.status = 'pending'
                    payment.save()
                    
            except Payment.DoesNotExist:
                # Create new payment record
                transaction_id = self.generate_transaction_id(booking_id)
                payment = Payment.objects.create(
                    booking=booking,
                    customer=booking.customer,
                    amount=amount,
                    transaction_id=transaction_id,
                    status='pending'
                )
            
            # Prepare SSLCommerz payment data
            payment_data = {
                # Store Information
                'store_id': self.store_id,
                'store_passwd': self.store_password,
                
                # Transaction Information
                'total_amount': str(amount),
                'currency': 'BDT',
                'tran_id': transaction_id,
                'success_url': self.success_url,
                'fail_url': self.fail_url,
                'cancel_url': self.cancel_url,
                'ipn_url': self.ipn_url,
                
                # Customer Information
                'cus_name': customer_info.get('name', booking.customer.get_full_name() or booking.customer.username),
                'cus_email': customer_info.get('email', booking.email),
                'cus_add1': customer_info.get('address', 'Dhaka, Bangladesh'),
                'cus_city': customer_info.get('city', 'Dhaka'),
                'cus_state': customer_info.get('state', 'Dhaka'),
                'cus_postcode': customer_info.get('postcode', '1000'),
                'cus_country': customer_info.get('country', 'Bangladesh'),
                'cus_phone': customer_info.get('phone', booking.phone_number),
                
                # Product Information
                'product_name': f'BookNest Room Booking - {booking.room.title}',
                'product_category': 'Room Booking',
                'product_profile': 'general',
                
                # Shipping Information (same as customer for room booking)
                'ship_name': customer_info.get('name', booking.customer.get_full_name() or booking.customer.username),
                'ship_add1': customer_info.get('address', 'Dhaka, Bangladesh'),
                'ship_city': customer_info.get('city', 'Dhaka'),
                'ship_state': customer_info.get('state', 'Dhaka'),
                'ship_postcode': customer_info.get('postcode', '1000'),
                'ship_country': customer_info.get('country', 'Bangladesh'),
                
                # Additional Parameters
                'shipping_method': 'NO',
                'num_of_item': '1',
                'multi_card_name': 'mastercard,visacard,amexcard,bkash,rocket,nagad',
                'value_a': f'booking_id:{booking_id}',  # Custom parameter
                'value_b': f'customer_id:{booking.customer.id}',  # Custom parameter
                'value_c': f'room_id:{booking.room.id}',  # Custom parameter
            }
            
            # Make request to SSLCommerz
            response = requests.post(
                f'{self.base_url}/gwprocess/v4/api.php',
                data=payment_data,
                timeout=30
            )
            
            if response.status_code == 200:
                response_data = response.json()
                
                if response_data.get('status') == 'SUCCESS':
                    # Update payment record with SSLCommerz response
                    payment.session_key = response_data.get('sessionkey')
                    payment.gateway_page_url = response_data.get('GatewayPageURL')
                    payment.raw_response = response_data
                    payment.status = 'processing'
                    payment.save()
                    
                    logger.info(f"Payment initiated successfully: {transaction_id}")
                    
                    return {
                        'success': True,
                        'payment_url': response_data.get('GatewayPageURL'),
                        'transaction_id': transaction_id,
                        'session_key': response_data.get('sessionkey'),
                        'payment_id': payment.id
                    }
                else:
                    payment.status = 'failed'
                    payment.raw_response = response_data
                    payment.save()
                    
                    logger.error(f"SSLCommerz payment initiation failed: {response_data}")
                    
                    return {
                        'success': False,
                        'error': response_data.get('failedreason', 'Payment initiation failed'),
                        'details': response_data
                    }
            else:
                logger.error(f"SSLCommerz API error: {response.status_code} - {response.text}")
                payment.status = 'failed'
                payment.save()
                
                return {
                    'success': False,
                    'error': 'Payment gateway connection failed',
                    'details': response.text
                }
                
        except Booking.DoesNotExist:
            return {
                'success': False,
                'error': 'Booking not found'
            }
        except Exception as e:
            logger.error(f"Payment initiation error: {str(e)}")
            return {
                'success': False,
                'error': 'Internal server error during payment initiation'
            }
    
    def validate_transaction(self, transaction_id, amount, sslcommerz_data):
        """
        Validate transaction with SSLCommerz API
        
        Args:
            transaction_id (str): Our transaction ID
            amount (str): Transaction amount
            sslcommerz_data (dict): Data received from SSLCommerz
            
        Returns:
            dict: Validation response
        """
        try:
            validation_data = {
                'store_id': self.store_id,
                'store_passwd': self.store_password,
                'val_id': sslcommerz_data.get('val_id')
            }
            
            response = requests.get(
                f'{self.base_url}/validator/api/validationserverAPI.php',
                params=validation_data,
                timeout=30
            )
            
            if response.status_code == 200:
                validation_response = response.json()
                
                # Check if validation is successful
                if (validation_response.get('status') == 'VALID' and 
                    validation_response.get('tran_id') == transaction_id and
                    float(validation_response.get('amount', 0)) == float(amount)):
                    
                    return {
                        'valid': True,
                        'data': validation_response
                    }
                else:
                    return {
                        'valid': False,
                        'error': 'Transaction validation failed',
                        'details': validation_response
                    }
            else:
                return {
                    'valid': False,
                    'error': 'Validation API connection failed'
                }
                
        except Exception as e:
            logger.error(f"Transaction validation error: {str(e)}")
            return {
                'valid': False,
                'error': 'Internal server error during validation'
            }
    
    def process_payment_response(self, response_data, response_type='success'):
        """
        Process payment response from SSLCommerz
        
        Args:
            response_data (dict): Response data from SSLCommerz
            response_type (str): Type of response (success, fail, cancel)
            
        Returns:
            dict: Processing result
        """
        try:
            transaction_id = response_data.get('tran_id')
            
            if not transaction_id:
                return {
                    'success': False,
                    'error': 'Transaction ID not found in response'
                }
            
            # Get payment record
            try:
                payment = Payment.objects.get(transaction_id=transaction_id)
            except Payment.DoesNotExist:
                return {
                    'success': False,
                    'error': 'Payment record not found'
                }
            
            # Update payment with SSLCommerz response data
            payment.sslcommerz_transaction_id = response_data.get('tran_id')
            payment.bank_transaction_id = response_data.get('bank_tran_id')
            payment.card_type = response_data.get('card_type')
            payment.card_no = response_data.get('card_no')
            payment.card_issuer = response_data.get('card_issuer')
            payment.card_brand = response_data.get('card_brand')
            payment.card_issuer_country = response_data.get('card_issuer_country')
            payment.payment_method = self.map_payment_method(response_data.get('card_type'))
            payment.risk_level = response_data.get('risk_level')
            payment.risk_title = response_data.get('risk_title')
            payment.raw_response = response_data
            
            if response_type == 'success':
                # Validate transaction
                validation_result = self.validate_transaction(
                    transaction_id, 
                    str(payment.amount), 
                    response_data
                )
                
                if validation_result.get('valid'):
                    payment.status = 'paid'
                    payment.paid_at = timezone.now()
                    
                    # Update booking status
                    booking = payment.booking
                    booking.status = 'confirmed'
                    booking.total_amount = payment.amount
                    booking.save()
                    
                    # Send payment confirmation email
                    try:
                        send_payment_confirmation_email(booking, payment)
                    except Exception as email_error:
                        # Log email error but don't fail the payment
                        logger.error(f"Failed to send payment confirmation email for booking {booking.id}: {str(email_error)}")
                    
                    logger.info(f"Payment successful: {transaction_id}")
                    
                    return {
                        'success': True,
                        'message': 'Payment completed successfully',
                        'payment': payment,
                        'booking': booking
                    }
                else:
                    payment.status = 'failed'
                    logger.error(f"Payment validation failed: {transaction_id}")
                    
                    return {
                        'success': False,
                        'error': 'Payment validation failed',
                        'details': validation_result
                    }
            
            elif response_type == 'fail':
                payment.status = 'failed'
                
            elif response_type == 'cancel':
                payment.status = 'cancelled'
            
            payment.save()
            
            return {
                'success': False,
                'message': f'Payment {response_type}',
                'payment': payment
            }
            
        except Exception as e:
            logger.error(f"Payment response processing error: {str(e)}")
            return {
                'success': False,
                'error': 'Internal server error during payment processing'
            }
    
    def map_payment_method(self, card_type):
        """Map SSLCommerz card types to our payment methods"""
        mapping = {
            'VISA': 'visa',
            'MASTER': 'master',
            'AMEX': 'amex',
            'BKASH-BKash': 'bkash',
            'ROCKET': 'rocket',
            'NAGAD': 'nagad',
            'UPAY': 'upay',
            'NEXUS': 'nexus',
            'CITY_TOUCH': 'city_touch',
        }
        return mapping.get(card_type, 'other')
    
    def refund_payment(self, payment_id, refund_amount, reason, admin_user):
        """
        Process payment refund
        
        Args:
            payment_id (int): Payment ID
            refund_amount (Decimal): Refund amount
            reason (str): Refund reason
            admin_user (User): Admin processing the refund
            
        Returns:
            dict: Refund processing result
        """
        try:
            payment = Payment.objects.get(id=payment_id)
            
            if not payment.can_be_refunded:
                return {
                    'success': False,
                    'error': 'Payment cannot be refunded'
                }
            
            # For sandbox, we'll simulate refund process
            # In production, you would call SSLCommerz refund API
            
            payment.status = 'refunded'
            payment.refunded_by = admin_user
            payment.refund_reason = reason
            payment.admin_notes = f"Refunded {refund_amount} BDT on {timezone.now()}"
            payment.save()
            
            # Update booking status
            booking = payment.booking
            booking.status = 'cancelled'
            booking.save()
            
            logger.info(f"Payment refunded: {payment.transaction_id} by {admin_user.username}")
            
            return {
                'success': True,
                'message': 'Refund processed successfully',
                'payment': payment
            }
            
        except Payment.DoesNotExist:
            return {
                'success': False,
                'error': 'Payment not found'
            }
        except Exception as e:
            logger.error(f"Refund processing error: {str(e)}")
            return {
                'success': False,
                'error': 'Internal server error during refund processing'
            }


# Initialize service instance
sslcommerz_service = SSLCommerzService()
