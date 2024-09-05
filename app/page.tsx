"use client";
import { changeRoute } from "@/lib/slices/routeSlice/routeSlice";
import MainPanel from "@/components/MainPanel/MainPanel";
import { Call, CallEnd } from "@mui/icons-material";
import Sidebar from "@/components/Sidebar/Sidebar";
import Loader from "@/components/Loader/Loader";
import axios, { AxiosResponse } from "axios";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import socket from "@/utils/socket";
import { NextPage } from "next";
import Cookies from "js-cookie";

const Home: NextPage = () => {
  const [CallAudio, setCallAudio] = useState<HTMLAudioElement | null>(null);
  const [isSession, setIsSession] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [NewCallId, setNewCallId] = useState<string>();
  const [CallerData, setCallerData] = useState<any>();
  const [UserData, setUserData] = useState<userData>({
    _id: "",
    pwd: "",
    name: "",
    email: "",
    hashed: "",
    headline: "--",
    image: "/user.png",
  });

  const dispatch = useDispatch();
  const router = useRouter();
  const ws = socket;

  useEffect(() => {
    if (!Cookies.get("SESSION_UUID")) {
      router.push("/login");
    } else {
      setCallAudio(new Audio("/audios/callring2.mp3"));
      setLoading(false);
      const sessionUUID = Cookies.get("SESSION_UUID");
      if (sessionUUID && isSession === false) {
        setIsSession(true);
        axios
          .post(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/profile/`, {
            sessionId: sessionUUID,
          })
          .then(async (res: AxiosResponse) => {
            const data: userData = await res.data;
            if (data.image === undefined) {
              data.image = "/user.png";
            } else {
              data.image = `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/image/${data.image}`;
            }

            setUserData(data);
          })
          .catch((error) => {
            console.error("Error fetching profile:", error);
            Cookies.remove("SESSION_UUID");
            router.push("/login");
          });
      }
    }
  }, [isSession, router]);

  ws.connect();

  const receiveCall = () => {
    dispatch(changeRoute(window.location.pathname));
    if (!CallAudio) return;
    CallAudio.pause();
    CallAudio.currentTime = 0;
    router.push(`/vc/${NewCallId}`);
  };

  const declineCall = () => {
    ws.emit("declined", {
      callId: NewCallId,
      from: CallerData._id,
      to: UserData._id,
    });
    setNewCallId(undefined);
    setCallerData(undefined);
    if (!CallAudio) return;
    CallAudio.pause();
    CallAudio.currentTime = 0;
  };

  useEffect(() => {
    const handleCalling = async (data: any) => {
      if (data?.to === UserData._id) {
        ws.emit("ringing", data);

        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/userId`,
            { userId: data?.from }
          );

          setNewCallId(data.callId);
          setCallerData(response.data);

          try {
            if (CallAudio) {
              CallAudio.play();

              setTimeout(() => {
                setNewCallId(undefined);
                setCallerData(undefined);
                CallAudio.pause();
                CallAudio.currentTime = 0;
              }, 15000);
            }
          } catch (err) {
            console.log("got error in running audio file.", err);
          }
        } catch (error) {
          console.log(error);
        }
      }
    };

    ws.on("calling", handleCalling);

    return () => {
      ws.off("calling", handleCalling);
    };
  }, [UserData, CallAudio]);

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center bg-stone-900 w-full h-[100vh]">
          <Loader />
        </div>
      ) : (
        <div className="flex">
          <Sidebar />
          <MainPanel UserData={UserData} />
          {CallerData !== undefined ? (
            <div className="flex justify-between px-10 py-4 absolute top-0 left-0 right-0 h-auto bg-blue-800 text-white">
              <div className="sm:w-[80%] lg:w-[90%]">{CallerData?.name}</div>
              <div className="sm:w-[20%] lg:w-[10%] flex items-center justify-between">
                <button
                  className="bg-green-600 p-3 rounded-full"
                  onClick={receiveCall}
                >
                  <Call />
                </button>
                <button
                  className="bg-red-600 p-3 rounded-full"
                  onClick={declineCall}
                >
                  <CallEnd />
                </button>
              </div>
            </div>
          ) : (
            <></>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
