import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { saveUserSession } from "../../public/services/publicAuthApi";
import { useUserDashboard } from "../context/UserDashboardContext";
import { userDashboardApi } from "../services/userDashboardApi";
import iconAddImage from "../assets/icons/Addimage.svg";
import iconCheck from "../assets/icons/Check.svg";
import defaultProfile from "../assets/icons/profile.svg";

const uploadsBase = import.meta.env.VITE_UPLOADS_URL || "/uploads";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  countrycodeid: "0",
  mobile: "",
  location: "",
  country: "",
  password: "",
  pswd1: "",
  company_name: "",
  company_address: "",
  company_website: "",
  any_other: ""
};

export default function UserProfilePage() {
  const { setHeaderUser } = useUserDashboard();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [countryCodes, setCountryCodes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [emailVerified, setEmailVerified] = useState(0);
  const [mobileVerified, setMobileVerified] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [profileFile, setProfileFile] = useState(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userDashboardApi.getProfile();
      const payload = res.data?.data;
      if (!res.data?.status || !payload?.singleUser) {
        toast.error(res.data?.message || "Could not load profile.");
        return;
      }
      const u = payload.singleUser;
      setForm({
        first_name: u.first_name || "",
        last_name: u.last_name || "",
        email: u.email || "",
        countrycodeid: u.countrycodeid != null ? String(u.countrycodeid) : "0",
        mobile: u.mobile || "",
        location: u.location || "",
        country: u.country != null ? String(u.country) : "",
        password: "",
        pswd1: "",
        company_name: u.company_name || "",
        company_address: u.company_address || "",
        company_website: u.company_website || "",
        any_other: u.any_other || ""
      });
      setEmailVerified(Number(u.email_verification) || 0);
      setMobileVerified(Number(u.mobile_verification) || 0);
      setCountryCodes(payload.countryCodes || []);
      setCountries(payload.countries || []);
      if (u.profile_image) {
        setAvatarUrl(`${uploadsBase}/profile_image/${u.profile_image}`);
      } else {
        setAvatarUrl("");
      }
      setPreviewUrl("");
      setProfileFile(null);
      setHeaderUser({
        firstName: u.first_name || "",
        lastName: u.last_name || "",
        profileImage: u.profile_image || "",
        avatarPreview: ""
      });
    } catch {
      toast.error("Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, [setHeaderUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "first_name") setHeaderUser({ firstName: value });
    if (name === "last_name") setHeaderUser({ lastName: value });
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast.error("Please upload a PNG or JPG image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image max size is 2MB.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const blobUrl = URL.createObjectURL(file);
    setProfileFile(file);
    setPreviewUrl(blobUrl);
    setHeaderUser({ avatarPreview: blobUrl });
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileChange({ target: { files: [file] } });
    }
  };

  const validate = () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.mobile.trim()) {
      toast.error("Please fill all required fields.");
      return false;
    }
    if (!EMAIL_REGEX.test(form.email.trim())) {
      toast.error("Please enter valid email");
      return false;
    }
    if (form.password) {
      if (!PASSWORD_REGEX.test(form.password)) {
        toast.error(
          "Please set password 8 to 15 characters which contain at least one lowercase letter, one uppercase letter, one numeric digit, and one special character"
        );
        return false;
      }
      if (form.password !== form.pswd1) {
        toast.error("Password doesn't match");
        return false;
      }
    }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "password" || key === "pswd1") {
          if (form.password) fd.append(key, value);
        } else {
          fd.append(key, value);
        }
      });
      if (profileFile) fd.append("profile_image", profileFile);

      const res = await userDashboardApi.updateProfile(fd);
      const { code, message, data } = res.data || {};

      if (code === 1) {
        toast.success(message || "Profile Updated successfully!");
        if (data?.singleUser) {
          saveUserSession({
            user: {
              id: data.singleUser.id,
              first_name: data.singleUser.first_name,
              last_name: data.singleUser.last_name,
              email: data.singleUser.email,
              profile_image: data.singleUser.profile_image
            }
          });
          setHeaderUser({
            firstName: data.singleUser.first_name || "",
            lastName: data.singleUser.last_name || "",
            profileImage: data.singleUser.profile_image || "",
            avatarPreview: ""
          });
          if (data.singleUser.profile_image) {
            setAvatarUrl(`${uploadsBase}/profile_image/${data.singleUser.profile_image}`);
          }
          setEmailVerified(Number(data.singleUser.email_verification) || 0);
          setMobileVerified(Number(data.singleUser.mobile_verification) || 0);
        }
        setForm((prev) => ({ ...prev, password: "", pswd1: "" }));
        setProfileFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
      } else if (code === 2) {
        toast.error("Mobile number already exists!");
      } else if (code === 3) {
        toast.error("Email id already exists!");
      } else {
        toast.error(message || "Something went wrong please try again!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong please try again!");
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = previewUrl || avatarUrl || defaultProfile;

  if (loading) {
    return <div className="dashboard-loading">Loading profile…</div>;
  }

  return (
    <div className="user-profile-page">
      <div className="profile-area">
        <ul className="nav nav-tabs" role="tablist">
          <li className="nav-item">
            <button type="button" className="nav-link active">
              My Profile
            </button>
          </li>
        </ul>

        <div className="tab-content">
          <div id="myprofile" className="container tab-pane active">
            <form id="submitProfile" onSubmit={onSubmit} encType="multipart/form-data">
              <div className="row">
                <div className="col-lg-12">
                  <div className="form-group">
                    <label>Profile Picture</label>
                    <div className="uploadOuter">
                      <img
                        src={displayAvatar}
                        alt="Profile"
                        className="profile-preview-thumb"
                        onError={(ev) => {
                          ev.currentTarget.src = defaultProfile;
                        }}
                      />
                      <div
                        className="upload align-middle"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={onDrop}
                      >
                        <span className="dragBox">
                          <input
                            ref={fileInputRef}
                            type="file"
                            name="profile_image"
                            id="uploadFile"
                            accept="image/png,image/jpeg"
                            onChange={onFileChange}
                          />
                          <img src={iconAddImage} alt="" />
                        </span>
                        <span>Click to upload or drag and drop PNG or JPG here. Max size 2MB.</span>
                        <div className="browse">
                          <label htmlFor="uploadFile" className="btn">
                            Browse
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="form-group">
                    <label htmlFor="first_name">First Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="first_name"
                      name="first_name"
                      value={form.first_name}
                      onChange={onChange}
                      required
                    />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="form-group">
                    <label htmlFor="last_name">Last Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="last_name"
                      name="last_name"
                      value={form.last_name}
                      onChange={onChange}
                      required
                    />
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="row">
                    <div className="col-lg-9">
                      <div className="form-group">
                        <label htmlFor="email">Email Id</label>
                        <input
                          type="email"
                          className="form-control"
                          id="email"
                          name="email"
                          value={form.email}
                          onChange={onChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-lg-3 verified">
                      <a href="#verified" onClick={(e) => e.preventDefault()}>
                        <img src={iconCheck} alt="" />
                        {emailVerified === 1 ? "Verified" : "Unverified"}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="row">
                    <div className="col-lg-3">
                      <div className="form-group">
                        <label htmlFor="countrycode">Country Code</label>
                        <select
                          className="form-control"
                          name="countrycodeid"
                          id="countrycode"
                          value={form.countrycodeid}
                          onChange={onChange}
                        >
                          <option value="0">Select Country Code</option>
                          {countryCodes.map((cc) => (
                            <option key={cc.country_code_id} value={cc.country_code_id}>
                              {`${cc.iso_code || ""} ${cc.country_code || ""}`.trim()}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="form-group">
                        <label htmlFor="mobile">Phone Number</label>
                        <input
                          id="mobile"
                          type="tel"
                          name="mobile"
                          className="form-control"
                          value={form.mobile}
                          onChange={onChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-lg-3 verified">
                      <a href="#verified" onClick={(e) => e.preventDefault()}>
                        <img src={iconCheck} alt="" />
                        {mobileVerified === 1 ? "Verified" : "Unverified"}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <input
                      type="text"
                      className="form-control"
                      id="address"
                      name="location"
                      value={form.location}
                      onChange={onChange}
                    />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="form-group">
                    <label htmlFor="country">Country</label>
                    <select className="form-control" name="country" value={form.country} onChange={onChange}>
                      <option value="">Select any country</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.country_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="form-group">
                    <label htmlFor="password">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      value={form.password}
                      onChange={onChange}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="form-group">
                    <label htmlFor="cpassword">Confirm Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="cpassword"
                      name="pswd1"
                      value={form.pswd1}
                      onChange={onChange}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="form-group">
                    <label htmlFor="cname">Company Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="cname"
                      name="company_name"
                      value={form.company_name}
                      onChange={onChange}
                    />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="form-group">
                    <label htmlFor="caddress">Company Address</label>
                    <input
                      type="text"
                      className="form-control"
                      id="caddress"
                      name="company_address"
                      value={form.company_address}
                      onChange={onChange}
                    />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="form-group">
                    <label htmlFor="website">Company Website</label>
                    <input
                      type="text"
                      className="form-control"
                      id="website"
                      name="company_website"
                      value={form.company_website}
                      onChange={onChange}
                    />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="form-group">
                    <label htmlFor="details">Other Details</label>
                    <input
                      type="text"
                      className="form-control"
                      id="details"
                      name="any_other"
                      value={form.any_other}
                      onChange={onChange}
                    />
                  </div>
                </div>

                <div className="col-lg-12">
                  <div className="form-group btns">
                    <button type="submit" className="submitForm" disabled={saving}>
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
