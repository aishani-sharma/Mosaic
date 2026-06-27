import scenery from "../../assets/scenery.png";
import "./background.css";

export default function Background() {
    return (
        <div className="background">
            <img src={scenery} alt="" />
        </div>
    );
}