import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { MyContext } from '../../Context';

const PaymentManagement = ({ onDataUpdate }) => {
  const context = useContext(MyContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingRefund, setProcessingRefund] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    date_from: '',
    date_to: '',
    payment_method: ''
  });
  
  // Pagination and summary
  const [summary, setSummary] = useState({
    total_amount: '0.00',
    successful_payments: 0,
    failed_payments: 0,
    pending_payments: 0,
    refunded_payments: 0
  });
  
  // Refund modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [refundData, setRefundData] = useState({
    refund_amount: '',
    reason: ''
  });

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
          'Content-Type': 'application/json',
        },
        params: filters
      };

      const response = await axios.get('https://booknest-jhw4.onrender.com/hotel/management/payments/', config);

      if (response.data.success) {
        setPayments(response.data.data);
        setSummary(response.data.summary);
        setError(null);
      } else {
        setError('Failed to fetch payments');
      }
    } catch (err) {
      console.error('Payments fetch error:', err);
      setError('Error loading payments');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      date_from: '',
      date_to: '',
      payment_method: ''
    });
  };

  const formatAmount = (amount, currency = 'BDT') => {
    return `${parseFloat(amount).toLocaleString()} ${currency}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      paid: 'bg-success',
      pending: 'bg-warning',
      processing: 'bg-info',
      failed: 'bg-danger',
      cancelled: 'bg-secondary',
      refunded: 'bg-dark'
    };
    return `badge ${statusClasses[status] || 'bg-secondary'}`;
  };

  const getPaymentMethodIcon = (method) => {
    const icons = {
      visa: 'fab fa-cc-visa',
      master: 'fab fa-cc-mastercard',
      amex: 'fab fa-cc-amex',
      bkash: 'fas fa-mobile-alt',
      rocket: 'fas fa-rocket',
      nagad: 'fas fa-money-bill-wave',
      upay: 'fas fa-wallet',
      bank: 'fas fa-university',
      other: 'fas fa-credit-card'
    };
    return icons[method] || 'fas fa-credit-card';
  };

  const handleRefund = (payment) => {
    setSelectedPayment(payment);
    setRefundData({
      refund_amount: payment.amount,
      reason: ''
    });
    setShowRefundModal(true);
  };

  const processRefund = async () => {
    if (!selectedPayment || !refundData.reason.trim()) {
      alert('Please provide a refund reason');
      return;
    }

    try {
      setProcessingRefund(selectedPayment.id);
      const config = {
        headers: {
          Authorization: `Bearer ${context.token}`,
          'Content-Type': 'application/json',
        },
      };

      const response = await axios.post(
        'https://booknest-jhw4.onrender.com/hotel/management/payments/',
        {
          payment_id: selectedPayment.id,
          refund_amount: parseFloat(refundData.refund_amount),
          reason: refundData.reason
        },
        config
      );

      if (response.data.success) {
        alert('Refund processed successfully!');
        setShowRefundModal(false);
        fetchPayments(); // Refresh data
        if (onDataUpdate) onDataUpdate(); // Refresh parent dashboard
      } else {
        alert(`Refund failed: ${response.data.message}`);
      }
    } catch (err) {
      console.error('Refund error:', err);
      alert(`Error processing refund: ${err.response?.data?.message || err.message}`);
    } finally {
      setProcessingRefund(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading payments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <h4>Error</h4>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchPayments}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="payment-management">
      {/* Payment Summary Cards */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Total Revenue</h6>
                  <h4>{formatAmount(summary.total_amount)}</h4>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-coins fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Successful</h6>
                  <h4>{summary.successful_payments}</h4>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-check-circle fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Pending</h6>
                  <h4>{summary.pending_payments}</h4>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-clock fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-danger text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Failed</h6>
                  <h4>{summary.failed_payments}</h4>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-times-circle fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header">
          <h5><i className="fas fa-filter me-2"></i>Payment Filters</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-lg-3 col-md-6 mb-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            
            <div className="col-lg-3 col-md-6 mb-3">
              <label className="form-label">Payment Method</label>
              <select
                className="form-select"
                name="payment_method"
                value={filters.payment_method}
                onChange={handleFilterChange}
              >
                <option value="">All Methods</option>
                <option value="visa">Visa</option>
                <option value="master">MasterCard</option>
                <option value="amex">American Express</option>
                <option value="bkash">bKash</option>
                <option value="rocket">Rocket</option>
                <option value="nagad">Nagad</option>
                <option value="upay">Upay</option>
                <option value="bank">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="col-lg-2 col-md-6 mb-3">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-control"
                name="date_from"
                value={filters.date_from}
                onChange={handleFilterChange}
              />
            </div>
            
            <div className="col-lg-2 col-md-6 mb-3">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-control"
                name="date_to"
                value={filters.date_to}
                onChange={handleFilterChange}
              />
            </div>
            
            <div className="col-lg-2 col-md-12 d-flex align-items-end mb-3">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={clearFilters}
              >
                <i className="fas fa-times me-1"></i>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5><i className="fas fa-credit-card me-2"></i>Payment Transactions ({payments.length})</h5>
          <button className="btn btn-sm btn-outline-primary" onClick={fetchPayments}>
            <i className="fas fa-sync-alt me-1"></i>
            Refresh
          </button>
        </div>
        <div className="card-body">
          {payments.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Customer</th>
                    <th>Room & Booking</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment Method</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <div>
                          <strong>{payment.transaction_id}</strong>
                          {payment.sslcommerz_transaction_id && (
                            <>
                              <br />
                              <small className="text-muted">
                                SSL: {payment.sslcommerz_transaction_id}
                              </small>
                            </>
                          )}
                        </div>
                      </td>
                      
                      <td>
                        <div>
                          <strong>{payment.customer_full_name}</strong>
                          <br />
                          <small className="text-muted">{payment.customer_email}</small>
                        </div>
                      </td>
                      
                      <td>
                        <div>
                          <strong>{payment.room_title}</strong>
                          <br />
                          <small className="text-muted">
                            Booking #{payment.booking_id}
                            {payment.nights_count && ` • ${payment.nights_count} nights`}
                          </small>
                        </div>
                      </td>
                      
                      <td>
                        <strong>{formatAmount(payment.amount, payment.currency)}</strong>
                      </td>
                      
                      <td>
                        <span className={getStatusBadgeClass(payment.status)}>
                          {payment.status_display}
                        </span>
                        {payment.paid_at && (
                          <>
                            <br />
                            <small className="text-success">
                              <i className="fas fa-check me-1"></i>
                              {formatDate(payment.paid_at)}
                            </small>
                          </>
                        )}
                      </td>
                      
                      <td>
                        {payment.payment_method ? (
                          <div>
                            <i className={`${getPaymentMethodIcon(payment.payment_method)} me-2`}></i>
                            {payment.payment_method_display}
                            {payment.masked_card_number && payment.masked_card_number !== 'N/A' && (
                              <>
                                <br />
                                <small className="text-muted">{payment.masked_card_number}</small>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      
                      <td>
                        <div>
                          {formatDate(payment.created_at)}
                          {payment.risk_level && (
                            <>
                              <br />
                              <small className={`badge ${payment.risk_level === '1' ? 'bg-success' : 'bg-warning'}`}>
                                Risk: {payment.risk_level}
                              </small>
                            </>
                          )}
                        </div>
                      </td>
                      
                      <td>
                        <div className="btn-group-vertical" role="group">
                          {payment.is_refundable && (
                            <button
                              className="btn btn-sm btn-outline-danger mb-1"
                              onClick={() => handleRefund(payment)}
                              disabled={processingRefund === payment.id}
                            >
                              {processingRefund === payment.id ? (
                                <span className="spinner-border spinner-border-sm" />
                              ) : (
                                <i className="fas fa-undo"></i>
                              )}
                              {' '}Refund
                            </button>
                          )}
                          
                          <button
                            className="btn btn-sm btn-outline-info"
                            data-bs-toggle="modal"
                            data-bs-target={`#paymentModal${payment.id}`}
                          >
                            <i className="fas fa-eye"></i> Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <i className="fas fa-credit-card fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">No Payment Transactions Found</h5>
              <p className="text-muted">Payment transactions will appear here once customers make payments.</p>
            </div>
          )}
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && selectedPayment && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Process Refund</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowRefundModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>Transaction:</strong> {selectedPayment.transaction_id}
                </div>
                <div className="mb-3">
                  <strong>Customer:</strong> {selectedPayment.customer_full_name}
                </div>
                <div className="mb-3">
                  <strong>Original Amount:</strong> {formatAmount(selectedPayment.amount, selectedPayment.currency)}
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Refund Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={refundData.refund_amount}
                    onChange={(e) => setRefundData({...refundData, refund_amount: e.target.value})}
                    max={selectedPayment.amount}
                    step="0.01"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Refund Reason *</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={refundData.reason}
                    onChange={(e) => setRefundData({...refundData, reason: e.target.value})}
                    placeholder="Please provide a reason for this refund..."
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowRefundModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={processRefund}
                  disabled={!refundData.reason.trim() || processingRefund}
                >
                  {processingRefund ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-undo me-2"></i>
                      Process Refund
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Detail Modals */}
      {payments.map((payment) => (
        <div 
          key={`modal-${payment.id}`}
          className="modal fade" 
          id={`paymentModal${payment.id}`} 
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Payment Details - {payment.transaction_id}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6><i className="fas fa-user me-2"></i>Customer Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Name:</strong></td>
                          <td>{payment.customer_full_name}</td>
                        </tr>
                        <tr>
                          <td><strong>Email:</strong></td>
                          <td>{payment.customer_email}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="col-md-6">
                    <h6><i className="fas fa-bed me-2"></i>Booking Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Room:</strong></td>
                          <td>{payment.room_title}</td>
                        </tr>
                        <tr>
                          <td><strong>Booking ID:</strong></td>
                          <td>#{payment.booking_id}</td>
                        </tr>
                        {payment.nights_count && (
                          <tr>
                            <td><strong>Nights:</strong></td>
                            <td>{payment.nights_count}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <hr />
                
                <div className="row">
                  <div className="col-md-6">
                    <h6><i className="fas fa-credit-card me-2"></i>Payment Details</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Amount:</strong></td>
                          <td>{formatAmount(payment.amount, payment.currency)}</td>
                        </tr>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>
                            <span className={getStatusBadgeClass(payment.status)}>
                              {payment.status_display}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Method:</strong></td>
                          <td>
                            {payment.payment_method_display || 'N/A'}
                            {payment.masked_card_number && payment.masked_card_number !== 'N/A' && (
                              <><br /><small>{payment.masked_card_number}</small></>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="col-md-6">
                    <h6><i className="fas fa-clock me-2"></i>Timeline</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Created:</strong></td>
                          <td>{formatDate(payment.created_at)}</td>
                        </tr>
                        {payment.paid_at && (
                          <tr>
                            <td><strong>Paid:</strong></td>
                            <td>{formatDate(payment.paid_at)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {(payment.card_issuer || payment.bank_transaction_id || payment.risk_level) && (
                  <>
                    <hr />
                    <h6><i className="fas fa-shield-alt me-2"></i>Security & Banking</h6>
                    <div className="row">
                      <div className="col-md-6">
                        {payment.card_issuer && (
                          <p><strong>Card Issuer:</strong> {payment.card_issuer}</p>
                        )}
                        {payment.card_brand && (
                          <p><strong>Card Brand:</strong> {payment.card_brand}</p>
                        )}
                      </div>
                      <div className="col-md-6">
                        {payment.bank_transaction_id && (
                          <p><strong>Bank Transaction:</strong> {payment.bank_transaction_id}</p>
                        )}
                        {payment.risk_level && (
                          <p>
                            <strong>Risk Level:</strong>{' '}
                            <span className={`badge ${payment.risk_level === '1' ? 'bg-success' : 'bg-warning'}`}>
                              {payment.risk_level}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
                
                {(payment.refund_reason || payment.admin_notes) && (
                  <>
                    <hr />
                    <h6><i className="fas fa-user-shield me-2"></i>Admin Notes</h6>
                    {payment.refund_reason && (
                      <p><strong>Refund Reason:</strong> {payment.refund_reason}</p>
                    )}
                    {payment.admin_notes && (
                      <p><strong>Admin Notes:</strong> {payment.admin_notes}</p>
                    )}
                    {payment.refunded_by_name && (
                      <p><strong>Processed by:</strong> {payment.refunded_by_name}</p>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PaymentManagement;
