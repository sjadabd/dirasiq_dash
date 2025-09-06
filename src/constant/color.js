const results = JSON.parse(localStorage.getItem("results"));
import ba from "@/assets/images/print/alrawan.jpg";
import rrr from "@/assets/images/print/alrawan1.jpg";
import ocr from "@/assets/images/print/ocr1.png";

const centerId = results?.center_id?._id || "default";

var colors = {};
if (centerId === "67b9a76da56dab25e4b2de01") {
  colors = {
    name: "مجمع البروج السكني",
    nameEN: "buruj",
    background: "rgb(33 36 91)",
    color: "#ffffff",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "6638d6a4c8462a1d83346b54") {
  colors = {
    name: "مجمع لاماسو السكني",
    nameEN: "Lamassu",
    background: "rgb(124 20 65)",
    color: "#ffffff",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "67b5cd5be9db64e0451ea6c1") {
  colors = {
    name: "مجمع الخلود السكني",
    nameEN: "Alkholood",
    background: "rgb(191 157 94)",
    color: "#ffffff",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "67b4451fe9db64e0451dcf82") {
  colors = {
    name: "مجمع النسيم السكني",
    nameEN: "AL Nasim",
    background: "#074570",
    color: "#ffffff",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "672981a677eecc001eb05f4a") {
  colors = {
    name: "شركة لوم العقارية",
    nameEN: "Loam",
    background: "#797464",
    color: "#ffffff",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "6729808e77eecc001eb05f19") {
  colors = {
    name: "مجمع مارينا بغداد السكني",
    nameEN: "Marina Baghdad",
    background: "rgb(97 108 116)",
    color: "#ffffff",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "6725ceff739176087eb6789f") {
  colors = {
    name: "مجمع الجنائن الفلوجة السكني",
    nameEN: "Aljanain",
    background: "#1d212f",
    color: "#ffffff",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "66e9376b2dcd8ef700ac5f01") {
  colors = {
    name: "مجمع الفاخر السكني",
    nameEN: "ALFAKHER TOWERS",
    background: "rgb(41 49 57)",
    color: "rgb(234 229 162)",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "66e937122dcd8ef700ac5ed6") {
  colors = {
    name: "مجمع الود السكني",
    nameEN: "Alweed",
    background: "rgb(13 64 73)",
    color: "rgb(234 229 162)",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "66e2c810dec89fdfea71c92b") {
  colors = {
    name: "مجمع كرم بغداد السكني",
    nameEN: "Karam Bagdad",
    background: "#033149",
    color: "rgb(234 229 162)",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "66a8a602996fa363c5a0f6f5") {
  colors = {
    name: "ابراج لاماك السكنية",
    nameEN: "Lamac",
    color: "rgb(96 33 52)",
    background: "rgb(216 214 215)",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "6667fa62668eb9af32976f03") {
  colors = {
    name: "مجمع الرتاج السكني",
    nameEN: "Alrtaj",
    color: "rgb(75 90 152)",
    background: "rgb(199 221 197)",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "66656b164cdec95cab679181") {
  colors = {
    name: "مجمع الروان السكني",
    nameEN: "Alrawan",
    color: "rgb(0 0 0)",
    background: "rgb(34 176 232)",
    imgTop: ba,
    imgBottom: rrr,
  };
} else if (centerId === "663944d5260d48b0635862ad") {
  colors = {
    name: "شركة بوابة المستقبل للتسويق",
    nameEN: "Futuregate",
    color: "rgb(212 224 225)",
    background: "rgb(0 27 33)",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "65e818b420bce937fbf81fe4") {
  colors = {
    name: "مجمع النهضة السكني",
    nameEN: "Alnahda",
    color: "rgb(0 0 0)",
    background: "rgb(201 201 201)",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "673ca1efc96f983369558fd4") {
  colors = {
    name: "مدينة شط العرب السكنية",
    nameEN: "SHAT ALARAB CITY",
    color: "rgb(255 255 255)",
    background: "#0c2d4e",
    imgTop: null,
    imgBottom: null,
  };
} else if (centerId === "681fa80f14fa7e17f03fe6d7") {
  colors = {
    name: "OCR",
    nameEN: "OCR",
    color: "rgb(255 255 255)",
    background: "rgb(189 148 120)",
    imgTop: ocr,
    imgBottom: null,
  };
}

export default colors;
