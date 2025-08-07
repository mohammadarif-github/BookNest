"""
Payment Views for SSLCommerz Integration
Handles payment initiation, callbacks, and admin management
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404, redirect
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.db import transaction
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import json
import logging

from .models import Booking, Payment
from .payment_service import sslcommerz_service
from .permissions import IsManagerOrAdmin
from .serializer import PaymentSerializer

logger = logging.getLogger(__name__)


class InitiatePaymentView(APIView):
    """
    Initiate payment for a booking
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Initiate payment for a booking",
        operation_summary="Initiate Payment",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['booking_id'],
            properties={
                'booking_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='Booking ID'),
                'customer_info': openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    description='Customer information for payment',
                    properties={
                        'name': openapi.Schema(type=openapi.TYPE_STRING),
                        'email': openapi.Schema(type=openapi.TYPE_STRING),
                        'phone': openapi.Schema(type=openapi.TYPE_STRING),
                        'address': openapi.Schema(type=openapi.TYPE_STRING),
                        'city': openapi.Schema(type=openapi.TYPE_STRING),
                        'postcode': openapi.Schema(type=openapi.TYPE_STRING),
                    }
                )
            }
        ),
        responses={
            200: openapi.Response(
                description="Payment initiated successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Payment initiated successfully",
                        "data": {
                            "payment_url": "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=PAY&PAYMENTID=...",
                            "transaction_id": "HTL123202508051234abcd1234",
                            "amount": "500.00",
                            "currency": "BDT"
                        }
                    }
                }
            )
        },
        tags=['Payment']
    )
    def post(self, request):
        """Initiate payment for booking"""
        try:
            booking_id = request.data.get('booking_id')
            customer_info = request.data.get('customer_info', {})
            
            if not booking_id:
                return Response({
                    'success': False,
                    'message': 'Booking ID is required',
                    'error': 'Missing booking_id'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get booking and verify ownership
            booking = get_object_or_404(Booking, id=booking_id)
            
            # Check if user owns this booking or is admin/manager
            if booking.customer != request.user:
                # If not the booking owner, check if admin/manager
                if (not hasattr(request.user, 'booknest_role') or
                    request.user.booknest_role.role not in ['admin', 'manager']):
                    return Response({
                        'success': False,
                        'message': 'Access denied',
                        'error': 'You can only pay for your own bookings'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if booking is in correct status
            if booking.status not in ['pending', 'confirmed']:
                return Response({
                    'success': False,
                    'message': 'Booking is not available for payment',
                    'error': f'Booking status: {booking.status}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if payment already exists and is successful
            if hasattr(booking, 'payment') and booking.payment.is_successful:
                return Response({
                    'success': False,
                    'message': 'Payment already completed for this booking',
                    'error': 'Duplicate payment attempt'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate payment amount
            amount = booking.calculate_total_amount()
            
            # Merge customer info with booking data
            customer_data = {
                'name': customer_info.get('name', booking.customer.get_full_name() or booking.customer.username),
                'email': customer_info.get('email', booking.email),
                'phone': customer_info.get('phone', booking.phone_number),
                'address': customer_info.get('address', ''),
                'city': customer_info.get('city', 'Dhaka'),
                'postcode': customer_info.get('postcode', '1000'),
            }
            
            # Initiate payment with SSLCommerz
            payment_result = sslcommerz_service.initiate_payment(
                booking_id=booking_id,
                amount=amount,
                customer_info=customer_data
            )
            
            if payment_result.get('success'):
                return Response({
                    'success': True,
                    'message': 'Payment initiated successfully',
                    'data': {
                        'payment_url': payment_result.get('payment_url'),
                        'transaction_id': payment_result.get('transaction_id'),
                        'amount': str(amount),
                        'currency': 'BDT',
                        'booking_id': booking_id,
                        'payment_id': payment_result.get('payment_id')
                    }
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'message': 'Payment initiation failed',
                    'error': payment_result.get('error'),
                    'details': payment_result.get('details')
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Payment initiation error: {str(e)}")
            return Response({
                'success': False,
                'message': 'Internal server error',
                'error': 'Payment initiation failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PaymentSuccessView(APIView):
    """
    Handle successful payment callback from SSLCommerz
    """
    authentication_classes = []  # No authentication required for callbacks
    permission_classes = []
    
    def post(self, request):
        """Handle payment success callback"""
        try:
            response_data = request.data if request.data else request.POST.dict()
            
            logger.info(f"Payment success callback received: {response_data}")
            
            # Process payment response
            result = sslcommerz_service.process_payment_response(response_data, 'success')
            
            # Get transaction details for redirect
            transaction_id = response_data.get('tran_id', '')
            booking_id = ''
            
            # Extract booking ID from transaction ID or value_a
            if 'value_a' in response_data:
                booking_value = response_data.get('value_a', '')
                if booking_value.startswith('booking_id:'):
                    booking_id = booking_value.split('booking_id:')[1]
            
            # Always redirect to React frontend for POST requests too
            if result.get('success'):
                # Redirect to success page with transaction details
                redirect_url = f"http://localhost:3000/payment/success/{transaction_id}"
                if booking_id:
                    redirect_url += f"?booking_id={booking_id}"
                return redirect(redirect_url)
            else:
                # Redirect to failure page
                error_msg = result.get('error', 'Payment processing failed')
                redirect_url = f"http://localhost:3000/payment/failure/{transaction_id}"
                redirect_url += f"?error={error_msg}"
                if booking_id:
                    redirect_url += f"&booking_id={booking_id}"
                return redirect(redirect_url)
                
        except Exception as e:
            logger.error(f"Payment success callback error: {str(e)}")
            # Redirect to error page
            redirect_url = f"http://localhost:3000/payment/failure/unknown?error=Internal server error"
            return redirect(redirect_url)
    
    def get(self, request):
        """Handle GET requests (redirect after payment)"""
        # Extract parameters from URL
        response_data = request.GET.dict()
        
        try:
            logger.info(f"Payment success GET callback received: {response_data}")
            
            # Process payment response
            result = sslcommerz_service.process_payment_response(response_data, 'success')
            
            # Get transaction details for redirect
            transaction_id = response_data.get('tran_id', '')
            booking_id = ''
            
            # Extract booking ID from transaction ID or value_a
            if 'value_a' in response_data:
                booking_value = response_data.get('value_a', '')
                if booking_value.startswith('booking_id:'):
                    booking_id = booking_value.split('booking_id:')[1]
            
            # Redirect to React frontend with payment result
            if result.get('success'):
                # Redirect to success page with transaction details
                redirect_url = f"http://localhost:3000/payment/success/{transaction_id}?booking_id={booking_id}"
                return redirect(redirect_url)
            else:
                # Redirect to failure page
                redirect_url = f"http://localhost:3000/payment/failure/{transaction_id}?booking_id={booking_id}&error={result.get('error', 'Payment processing failed')}"
                return redirect(redirect_url)
                
        except Exception as e:
            logger.error(f"Payment success redirect error: {str(e)}")
            # Redirect to error page
            redirect_url = f"http://localhost:3000/payment/failure/unknown?error=Internal server error"
            return redirect(redirect_url)


@method_decorator(csrf_exempt, name='dispatch')
class PaymentFailView(APIView):
    """
    Handle failed payment callback from SSLCommerz
    """
    authentication_classes = []
    permission_classes = []
    
    def post(self, request):
        """Handle payment failure callback"""
        try:
            response_data = request.data if request.data else request.POST.dict()
            
            logger.info(f"Payment fail callback received: {response_data}")
            
            # Process payment response
            result = sslcommerz_service.process_payment_response(response_data, 'fail')
            
            # Get transaction details for redirect
            transaction_id = response_data.get('tran_id', 'unknown')
            booking_id = ''
            
            # Extract booking ID from transaction ID or value_a
            if 'value_a' in response_data:
                booking_value = response_data.get('value_a', '')
                if booking_value.startswith('booking_id:'):
                    booking_id = booking_value.split('booking_id:')[1]
            
            # Redirect to React frontend failure page
            error_msg = response_data.get('error', 'Payment failed')
            redirect_url = f"http://localhost:3000/payment/failure/{transaction_id}"
            redirect_url += f"?error={error_msg}"
            if booking_id:
                redirect_url += f"&booking_id={booking_id}"
            return redirect(redirect_url)
            
        except Exception as e:
            logger.error(f"Payment fail callback error: {str(e)}")
            redirect_url = f"http://localhost:3000/payment/failure/unknown?error=Internal server error"
            return redirect(redirect_url)
    
    def get(self, request):
        """Handle GET requests for payment failure"""
        response_data = request.GET.dict()
        try:
            # Get transaction details for redirect
            transaction_id = response_data.get('tran_id', 'unknown')
            booking_id = response_data.get('booking_id', '')
            
            # Redirect to React frontend failure page
            error_msg = response_data.get('error', 'Payment failed')
            redirect_url = f"http://localhost:3000/payment/failure/{transaction_id}"
            redirect_url += f"?error={error_msg}"
            if booking_id:
                redirect_url += f"&booking_id={booking_id}"
            return redirect(redirect_url)
        except Exception as e:
            logger.error(f"Payment fail GET redirect error: {str(e)}")
            redirect_url = f"http://localhost:3000/payment/failure/unknown?error=Internal server error"
            return redirect(redirect_url)


@method_decorator(csrf_exempt, name='dispatch')
class PaymentCancelView(APIView):
    """
    Handle cancelled payment callback from SSLCommerz
    """
    authentication_classes = []
    permission_classes = []
    
    def post(self, request):
        """Handle payment cancellation callback"""
        try:
            response_data = request.data if request.data else request.POST.dict()
            
            logger.info(f"Payment cancel callback received: {response_data}")
            
            # Process payment response
            result = sslcommerz_service.process_payment_response(response_data, 'cancel')
            
            # Get transaction details for redirect
            transaction_id = response_data.get('tran_id', 'unknown')
            booking_id = ''
            
            # Extract booking ID from transaction ID or value_a
            if 'value_a' in response_data:
                booking_value = response_data.get('value_a', '')
                if booking_value.startswith('booking_id:'):
                    booking_id = booking_value.split('booking_id:')[1]
            
            # Redirect to React frontend failure page (cancelled payments go to failure page)
            redirect_url = f"http://localhost:3000/payment/failure/{transaction_id}"
            redirect_url += f"?error=Payment cancelled by user"
            if booking_id:
                redirect_url += f"&booking_id={booking_id}"
            return redirect(redirect_url)
            
        except Exception as e:
            logger.error(f"Payment cancel callback error: {str(e)}")
            redirect_url = f"http://localhost:3000/payment/failure/unknown?error=Internal server error"
            return redirect(redirect_url)
    
    def get(self, request):
        """Handle GET requests for payment cancellation"""
        response_data = request.GET.dict()
        
        try:
            logger.info(f"Payment cancel GET callback received: {response_data}")
            
            # Get transaction details for redirect
            transaction_id = response_data.get('tran_id', 'unknown')
            booking_id = response_data.get('booking_id', '')
            
            # Redirect to React frontend failure page (cancelled payments go to failure page)
            redirect_url = f"http://localhost:3000/payment/failure/{transaction_id}"
            redirect_url += f"?error=Payment cancelled by user"
            if booking_id:
                redirect_url += f"&booking_id={booking_id}"
            return redirect(redirect_url)
            
        except Exception as e:
            logger.error(f"Payment cancel GET redirect error: {str(e)}")
            redirect_url = f"http://localhost:3000/payment/failure/unknown?error=Internal server error"
            return redirect(redirect_url)
            
            # Get transaction details for redirect
            transaction_id = response_data.get('tran_id', '')
            booking_id = ''
            
            # Extract booking ID from transaction ID or value_a
            if 'value_a' in response_data:
                booking_value = response_data.get('value_a', '')
                if booking_value.startswith('booking_id:'):
                    booking_id = booking_value.split('booking_id:')[1]
            
            # Redirect to React frontend cancel page
            redirect_url = f"http://localhost:3000/payment/cancelled?transaction_id={transaction_id}&booking_id={booking_id}&status=cancelled"
            return redirect(redirect_url)
            
        except Exception as e:
            logger.error(f"Payment cancel redirect error: {str(e)}")
            redirect_url = f"http://localhost:3000/payment/cancelled?error=Internal server error"
            return redirect(redirect_url)


@method_decorator(csrf_exempt, name='dispatch')
class PaymentIPNView(APIView):
    """
    Handle IPN (Instant Payment Notification) from SSLCommerz
    """
    authentication_classes = []
    permission_classes = []
    
    def post(self, request):
        """Handle IPN callback"""
        try:
            response_data = request.data if request.data else request.POST.dict()
            
            logger.info(f"Payment IPN received: {response_data}")
            
            # Process IPN (similar to success but more secure)
            result = sslcommerz_service.process_payment_response(response_data, 'success')
            
            # Return simple OK response for IPN
            return HttpResponse('OK')
            
        except Exception as e:
            logger.error(f"Payment IPN error: {str(e)}")
            return HttpResponse('ERROR')


class PaymentManagementView(APIView):
    """
    Payment management for admins and managers
    """
    permission_classes = [IsManagerOrAdmin]
    
    @swagger_auto_schema(
        operation_description="Get all payments with filtering options",
        operation_summary="Get All Payments",
        manual_parameters=[
            openapi.Parameter('status', openapi.IN_QUERY, description="Filter by payment status", type=openapi.TYPE_STRING),
            openapi.Parameter('date_from', openapi.IN_QUERY, description="Filter from date (YYYY-MM-DD)", type=openapi.TYPE_STRING),
            openapi.Parameter('date_to', openapi.IN_QUERY, description="Filter to date (YYYY-MM-DD)", type=openapi.TYPE_STRING),
            openapi.Parameter('payment_method', openapi.IN_QUERY, description="Filter by payment method", type=openapi.TYPE_STRING),
        ],
        responses={
            200: openapi.Response(
                description="Payments retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Payments retrieved successfully",
                        "data": [],
                        "count": 0,
                        "summary": {
                            "total_amount": "0.00",
                            "successful_payments": 0,
                            "failed_payments": 0,
                            "pending_payments": 0
                        }
                    }
                }
            )
        },
        tags=['Payment Management']
    )
    def get(self, request):
        """Get all payments with filtering and summary"""
        try:
            payments = Payment.objects.select_related(
                'customer', 'booking', 'booking__room', 'processed_by'
            ).order_by('-created_at')
            
            # Apply filters
            status_filter = request.query_params.get('status')
            if status_filter:
                payments = payments.filter(status=status_filter)
            
            date_from = request.query_params.get('date_from')
            if date_from:
                payments = payments.filter(created_at__date__gte=date_from)
            
            date_to = request.query_params.get('date_to')
            if date_to:
                payments = payments.filter(created_at__date__lte=date_to)
            
            payment_method = request.query_params.get('payment_method')
            if payment_method:
                payments = payments.filter(payment_method=payment_method)
            
            # Calculate summary
            all_payments = payments
            summary = {
                'total_amount': str(sum(p.amount for p in all_payments.filter(status='paid'))),
                'successful_payments': all_payments.filter(status='paid').count(),
                'failed_payments': all_payments.filter(status='failed').count(),
                'pending_payments': all_payments.filter(status__in=['pending', 'processing']).count(),
                'refunded_payments': all_payments.filter(status='refunded').count()
            }
            
            serializer = PaymentSerializer(payments, many=True)
            
            return Response({
                'success': True,
                'message': 'Payments retrieved successfully',
                'data': serializer.data,
                'count': payments.count(),
                'summary': summary
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving payments: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve payments',
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_description="Process payment refund",
        operation_summary="Refund Payment",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['payment_id', 'refund_amount', 'reason'],
            properties={
                'payment_id': openapi.Schema(type=openapi.TYPE_INTEGER, description='Payment ID'),
                'refund_amount': openapi.Schema(type=openapi.TYPE_NUMBER, description='Refund amount'),
                'reason': openapi.Schema(type=openapi.TYPE_STRING, description='Refund reason'),
            }
        ),
        responses={
            200: openapi.Response(
                description="Refund processed successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Refund processed successfully",
                        "data": {}
                    }
                }
            )
        },
        tags=['Payment Management']
    )
    def post(self, request):
        """Process payment refund"""
        try:
            payment_id = request.data.get('payment_id')
            refund_amount = request.data.get('refund_amount')
            reason = request.data.get('reason')
            
            if not all([payment_id, refund_amount, reason]):
                return Response({
                    'success': False,
                    'message': 'Payment ID, refund amount, and reason are required',
                    'error': 'Missing required fields'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Process refund
            result = sslcommerz_service.refund_payment(
                payment_id=payment_id,
                refund_amount=refund_amount,
                reason=reason,
                admin_user=request.user
            )
            
            if result.get('success'):
                return Response({
                    'success': True,
                    'message': result.get('message'),
                    'data': {
                        'payment_id': payment_id,
                        'refund_amount': str(refund_amount),
                        'processed_by': request.user.username
                    }
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'message': result.get('error'),
                    'error': 'Refund processing failed'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Refund processing error: {str(e)}")
            return Response({
                'success': False,
                'message': 'Internal server error',
                'error': 'Refund processing failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaymentStatusView(APIView):
    """
    Check payment status for a transaction
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Check payment status",
        operation_summary="Check Payment Status",
        manual_parameters=[
            openapi.Parameter('transaction_id', openapi.IN_QUERY, description="Transaction ID", type=openapi.TYPE_STRING, required=True),
        ],
        responses={
            200: openapi.Response(
                description="Payment status retrieved successfully",
                examples={
                    "application/json": {
                        "success": True,
                        "message": "Payment status retrieved successfully",
                        "data": {
                            "transaction_id": "HTL123202508051234abcd1234",
                            "status": "paid",
                            "amount": "500.00",
                            "payment_method": "visa",
                            "paid_at": "2025-08-05T10:30:45Z"
                        }
                    }
                }
            )
        },
        tags=['Payment']
    )
    def get(self, request):
        """Check payment status"""
        try:
            transaction_id = request.query_params.get('transaction_id')
            
            if not transaction_id:
                return Response({
                    'success': False,
                    'message': 'Transaction ID is required',
                    'error': 'Missing transaction_id'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                payment = Payment.objects.select_related('booking', 'customer').get(
                    transaction_id=transaction_id
                )
                
                # Check if user owns this payment or is admin/manager
                if payment.customer != request.user:
                    # If not the payment owner, check if admin/manager
                    if (not hasattr(request.user, 'booknest_role') or
                        request.user.booknest_role.role not in ['admin', 'manager']):
                        return Response({
                            'success': False,
                            'message': 'Access denied',
                            'error': 'You can only check your own payment status'
                        }, status=status.HTTP_403_FORBIDDEN)
                
                serializer = PaymentSerializer(payment)
                
                return Response({
                    'success': True,
                    'message': 'Payment status retrieved successfully',
                    'data': serializer.data
                }, status=status.HTTP_200_OK)
                
            except Payment.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Payment not found',
                    'error': 'Invalid transaction ID'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            logger.error(f"Payment status check error: {str(e)}")
            return Response({
                'success': False,
                'message': 'Internal server error',
                'error': 'Payment status check failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
