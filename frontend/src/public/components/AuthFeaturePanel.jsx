import iconContent from "../assets/auth/eos.svg";
import iconFilm from "../assets/auth/film.svg";

export default function AuthFeaturePanel() {
  return (
    <div className="auth-feature-col">
      <div className="auth-feature-col__card auth-feature-col__card--purple auth-feature-col__card--align-end">
        <h6>Instant Visibility</h6>
        <p>
          Do you have a PR thought all set? Connect with us and we will situate it to an immense system of writers and
          medita focuses instantle.
        </p>
      </div>

      <div className="auth-feature-col__card auth-feature-col__card--white auth-feature-col__card--align-start">
        <img src={iconContent} alt="" width={24} height={24} />
        <h6>Guidance on Content</h6>
        <p>
          We will assist you with making a phenomenal Press release included targeted SEO keywords that genuinely
          advances to your intended interest group.
        </p>
      </div>

      <div className="auth-feature-col__card auth-feature-col__card--purple auth-feature-col__card--narrow auth-feature-col__card--align-end-offset">
        <h6>
          Simple,
          <br />
          Quick &amp; Cost effective
        </h6>
      </div>

      <div className="auth-feature-col__card auth-feature-col__card--white auth-feature-col__card--narrow auth-feature-col__card--align-end">
        <img src={iconFilm} alt="" width={24} height={24} />
        <h6>Multimedia Content</h6>
      </div>
    </div>
  );
}
