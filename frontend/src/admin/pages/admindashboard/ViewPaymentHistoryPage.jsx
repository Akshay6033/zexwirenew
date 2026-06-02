import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import AdminPageLoader from "../../components/AdminPageLoader";
import AdminPageBackHead from "../../components/AdminPageBackHead";

function ViewPaymentHistoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const goBack = () => navigate("/admindashboard/manage_payment_history");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminDashboardApi.getPaymentHistoryDetail(id);
        setDetail(res.data?.data || null);
      } catch (error) {
        setDetail(null);
        toast.error(error.response?.data?.message || "Could not load payment details");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <AdminPageLoader label="Loading payment history…" />;

  if (!detail) {
    return (
      <div className="container-fluid manage-payment-history-page create-pr-legacy-page">
        <AdminPageBackHead title="View Payment History" onBack={goBack} />
        <p className="text-muted">Payment record not found.</p>
      </div>
    );
  }

  return (
    <div className="container-fluid manage-payment-history-page create-pr-legacy-page">
      <AdminPageBackHead title="View Payment History" onBack={goBack} />

      <div className="row">
        <div className="col-lg-12 col-sm-12">
          <div className="card m-b-30 table-bg distribution-table-card">
            <div className="card-body table-responsive">
              <h5 id="histroy-coupon" className="mb-3">
                Payment History
              </h5>
              <div className="table-odd">
                <table className="table table-bordered table-bg1 mb-0">
                  <thead>
                    <tr>
                      <th>User Name</th>
                      <th>Package Name</th>
                      <th>
                        Original
                        <br />
                        Price
                      </th>
                      <th>Paid USD</th>
                      <th>Coupon Name</th>
                      <th>Reason</th>
                      <th>
                        How many get discount
                        <br />
                        .% OR FLAT
                      </th>
                      <th>Payment Method</th>
                      <th>Network</th>
                      <th>Charge Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{detail.user_name}</td>
                      <td>{detail.package_name}</td>
                      <td style={detail.has_offer ? { textDecoration: "line-through" } : undefined}>
                        $ {detail.original_price_usd ?? 0}
                      </td>
                      <td>$ {detail.paid_usd ?? 0}</td>
                      <td>{detail.coupon_name}</td>
                      <td>{detail.reason}</td>
                      <td>{detail.discount_label}</td>
                      <td>{detail.payment_method}</td>
                      <td>{detail.coinbase_network}</td>
                      <td>{detail.coinbase_chargeid}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewPaymentHistoryPage;
