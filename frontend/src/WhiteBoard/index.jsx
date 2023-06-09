import React, { useRef, useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";
import "./styles/board.css";
import { Link } from "react-router-dom";
import CommonBtn from "../components/atoms/CommonBtn";
import BoardVideoRoomComponent from "./whiteBoardRTC/VideoRoomComponent";
import { useSelector } from "react-redux";
import BluePan from "../assets/images/board/blue_pan.png";
import BlackPan from "../assets/images/board/black_pan.png";
import RedPan from "../assets/images/board/red_pan.png";
import YellowPan from "../assets/images/board/yellow_pan.png";
import GreenPan from "../assets/images/board/green_pan.png";
import EraserPNG from "../assets/images/board/eraser.png";

import html2canvas from "html2canvas";
import Swal from "sweetalert2";
import axios from "axios";
import { FcCompactCamera } from "react-icons/fc";

const Board = () => {
  const canvasRef = useRef(null);
  const colorsRef = useRef(null);
  const socketRef = useRef();
  const [myRoomName, setMyRoomName] = useState();
  const user = useSelector((state) => state.user);
  const APPLICATION_SERVER_URL = "https://i8b207.p.ssafy.io/";

  function handleCapture() {
    const targetNode = document.getElementById("myCanvas");

    html2canvas(targetNode).then((canvas) => {
      const imageData = canvas.toDataURL("image/png");

      const currentTime = Date.now();

      const fileName = currentTime + ".png";

      const formData = new FormData();
      formData.append("file", dataURLtoBlob(imageData), fileName);
      formData.append("email", user["userEmail"]);

      axios
        .post(APPLICATION_SERVER_URL + "api/s3/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((response) => {
          Swal.fire({
            icon: "success",
            title: "내 정보에서 확인하세요!",
            showConfirmButton: false,
            timer: 1500,
          });

          // console.log("Image and form data saved successfully", response.data);
        })
        .catch((error) => {
          Swal.fire({
            icon: "error",
            title: "이미지 저장 실패",
            showConfirmButton: false,
            timer: 1500,
          });
          console.error("Error saving image and form data", error);
        });
    });
  }

  function dataURLtoBlob(dataURL) {
    const binary = atob(dataURL.split(",")[1]);
    const array = [];
    for (let i = 0; i < binary.length; i++) {
      array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], {
      type: "image/png",
    });
  }

  function clearBoard(emit, sessionName) {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
    if (!emit) {
      return;
    }
    socketRef.current.emit("erasing", sessionName);
  }
  function leaveSession() {
    socketRef.current.emit("leave_room", myRoomName);
  }

  useEffect(() => {
    let SessionName = "";
    getSessionId(user["userEmail"]);
    socketRef.current = io.connect("ws://i8b207.p.ssafy.io:8001");
    async function getSessionId(email) {
      const sessionId = await createSession(email);
      SessionName = sessionId;
      setMyRoomName(sessionId);

      socketRef.current.emit("join_room", sessionId);
    }

    async function createSession(email) {
      let guest = "true";

      // 유저 타입에 따라 매칭되는게 다름
      if (user["userType"] == "user") {
        guest = "false";
      } else if (user["userType"] == "guest") {
        guest = "true";
      }
      const response = await axios({
        method: "post",
        url: APPLICATION_SERVER_URL + "api/sessions",
        data: {
          email: email,
          gameType: "draw",
          guest: guest,
        },
        headers: { "Content-Type": "application/json;charset=UTF-8" },
      });
      console.info("세션 연결");
      return response.data; // The sessionId
    }

    // --------------- getContext() method returns a drawing context on the canvas-----

    const canvas = canvasRef.current;
    const test = colorsRef.current;
    const context = canvas.getContext("2d");

    // ----------------------- Colors --------------------------------------------------

    const colors = document.getElementsByClassName("color");

    // set the current color
    const current = {
      color: "black",
    };

    // helper that will update the current color
    const onColorUpdate = (e) => {
      // current.color = color;
      current.color = e.target.className.split(" ")[1];
    };

    // loop through the color elements and add the click event listeners
    for (let i = 0; i < colors.length; i++) {
      colors[i].addEventListener("click", onColorUpdate, false);
    }
    let drawing = false;

    // ------------------------------- create the drawing ----------------------------

    const drawLine = (x0, y0, x1, y1, color, emit) => {
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.stroke();
      context.closePath();

      if (!emit) {
        return;
      }
      const w = canvas.width;
      const h = canvas.height;
      // console.log(" 그 리 는 중 입 니 다.   방 이름은 ????", SessionName);
      socketRef.current.emit(
        "drawing",
        {
          x0: x0 / w,
          y0: y0 / h,
          x1: x1 / w,
          y1: y1 / h,
          color,
        },
        SessionName
      );
    };

    // ---------------- mouse movement --------------------------------------

    const onMouseDown = (e) => {
      drawing = true;
      current.x = e.clientX || e.touches[0].clientX;
      current.y = e.clientY || e.touches[0].clientY;
    };

    const onMouseMove = (e) => {
      if (!drawing) {
        return;
      }
      drawLine(
        current.x,
        current.y,
        e.clientX || e.touches[0].clientX,
        e.clientY || e.touches[0].clientY,
        current.color,
        true
      );
      current.x = e.clientX || e.touches[0].clientX;
      current.y = e.clientY || e.touches[0].clientY;
    };

    const onMouseUp = (e) => {
      if (!drawing) {
        return;
      }
      drawing = false;
      drawLine(
        current.x,
        current.y,
        e.clientX || e.touches[0].clientX,
        e.clientY || e.touches[0].clientY,
        current.color,
        true
      );
    };

    // ----------- limit the number of events per second -----------------------

    const throttle = (callback, delay) => {
      let previousCall = new Date().getTime();
      return function () {
        const time = new Date().getTime();

        if (time - previousCall >= delay) {
          previousCall = time;
          callback.apply(null, arguments);
        }
      };
    };

    // -----------------add event listeners to our canvas ----------------------

    canvas.addEventListener("mousedown", onMouseDown, false);
    canvas.addEventListener("mouseup", onMouseUp, false);
    canvas.addEventListener("mouseout", onMouseUp, false);
    canvas.addEventListener("mousemove", throttle(onMouseMove, 10), false);

    // Touch support for mobile devices
    canvas.addEventListener("touchstart", onMouseDown, false);
    canvas.addEventListener("touchend", onMouseUp, false);
    canvas.addEventListener("touchcancel", onMouseUp, false);
    canvas.addEventListener("touchmove", throttle(onMouseMove, 10), false);

    // -------------- make the canvas fill its parent component -----------------

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", onResize, false);
    onResize();

    // ----------------------- socket.io connection ----------------------------
    let onErasingEvent = () => {
      clearBoard(false, SessionName);
    };

    const onDrawingEvent = (data) => {
      const w = canvas.width;
      const h = canvas.height;
      drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
    };

    socketRef.current = io.connect("ws://i8b207.p.ssafy.io:8001");
    socketRef.current.on("drawing", onDrawingEvent);
    socketRef.current.on("erasing", onErasingEvent);
  }, []);

  // ------------- The Canvas and color elements --------------------------

  return (
    <div className="flex justify-between">
      <canvas id="myCanvas" ref={canvasRef} className="resize-y whiteboard" />

      <div className="flex justify end z-10">
        {myRoomName != null ? (
          <BoardVideoRoomComponent
            user={user["userChName"]}
            email={user["userEmail"]}
            userType={user["userType"]}
            sessionName={myRoomName}
          />
        ) : null}
      </div>

      <div
        ref={colorsRef}
        className="colors h-[200px] w-[400px] row-span-2 z-10 border-2 flex justify-between"
      >
        {myRoomName != null ? (
          <div className="font-chick ">{myRoomName}</div>
        ) : null}
        <img
          src={BlackPan}
          width="25"
          height="25"
          className="color black transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-150"
        />
        <img
          src={RedPan}
          width="25"
          height="25"
          className="color red transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-150"
        />
        <img
          src={GreenPan}
          width="22.5"
          height="21"
          className="color green transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-150"
        />
        <img
          src={BluePan}
          width="25"
          height="25"
          className="color blue transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-150"
        />
        <img
          src={YellowPan}
          width="25"
          height="25"
          className="color yellow transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-150"
        />

        <button
          className="absolute top-1.5 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-150"
          onClick={() => clearBoard(true, { myRoomName })}
        >
          <img src={EraserPNG} width="150" height="150" />
        </button>
        {user["userType"] == "user" ? (
          <button
            className="absolute top-5 left-56 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-150"
            onClick={() => handleCapture()}
          >
            <FcCompactCamera size={90} />
          </button>
        ) : null}
      </div>
      <div className="ml-[1em] absolute bottom-0 right-20 z-10">
        <Link to="/home">
          <CommonBtn
            text="나가기"
            color={"bg-pink-300"}
            onClick={leaveSession}
          />
        </Link>
      </div>
    </div>
  );
};
/* <img src={Eraser} alt="Eraser" /> */
export default Board;
