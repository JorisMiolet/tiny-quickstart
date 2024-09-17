import React, { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import "./App.scss";
import { Loader } from "./component/loader.tsx";

function App(props) {
  const [token, setToken] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accesToken, setAccesToken] = useState(null);
  const [loadData, setLoadData] = useState(false)

  const [count, setCount] = useState(0);

  const [added, setAdded] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [modified, setModified] = useState([]);

  const onSuccess = useCallback(
    async (publicToken) => {
      setLoadData(true)
      await fetch("/api/exchange_public_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ public_token: publicToken }),
      })
    },
    [count]
  );

  // Creates a Link token
  const createLinkToken = React.useCallback(async () => {
    // For OAuth, use previously generated Link token
    if (window.location.href.includes("?oauth_state_id=")) {
      const linkToken = localStorage.getItem("link_token");
      setToken(linkToken);
    } else {
      const response = await fetch("/api/create_link_token", {});
      const data = await response.json();

      setToken(data.link_token);
      localStorage.setItem("link_token", data.link_token);
    }
  }, [setToken, count]);

  //Fetch balance data
  // const getBalance = React.useCallback(async () => {
  //   setLoading(true);
  //   const response = await fetch("/api/balance", {});
  //   const data = await response.json();
  //   setData(data);
  //   setLoading(false);
  // }, [setData, setLoading]);

  const getTransactions = React.useCallback(async () => {
    setLoading(true)
    setLoadData(false)
    const res = await fetch(`/api/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        count: count,
      }),
    });
    const data = await res.json();

    setAdded(data.added);
    setModified(data.modified);
    setRemoved(data.removed);

    setData(data);

    setLoading(false);
    
  }, [setData, setLoading, count]);

  let isOauth = false;

  const config = {
    token,
    onSuccess,
  };

  // For OAuth, configure the received redirect URI
  if (window.location.href.includes("?oauth_state_id=")) {
    config.receivedRedirectUri = window.location.href;
    isOauth = true;
  }
  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    const fetchAccessToken = async () => {
      try {
        const res = await fetch("/api/getAccesToken", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        setAccesToken(data.access_token);
      } catch (error) {
        console.log("Error fetching access token:", error);
      }
    };

    fetchAccessToken();
  }, [loadData]);

  useEffect(() => {
    if (token == null) {
      createLinkToken();
    }
    if (isOauth && ready) {
      open();
    }
  }, [token, isOauth, ready, open]);

  const handleChange = (event) => {
    console.log(event.target.value);
    switch (event.target.name) {
      case "count_input":
        setCount(event.target.value);
        break;
    }
  };
  const LoadData = (arr, name) => (
    <>
      <p className="pt-8 pb-4">{name}:</p>
      {arr.length > 0 ? (
        <div className="overflow-auto h-[20vh]">
          {arr.map((transaction, index) => (
            <li key={index} className="list-none border-t-2 pt-2">
              <p>Transaction ID: {transaction.transaction_id}</p>
              <p>Amount: {transaction.amount}</p>
              <p>Merchant: {transaction.merchant_name}</p>
              <p>Date: {transaction.date}</p>
              <p>Category: {transaction.category.join(", ")}</p>
            </li>
          ))}
        </div>
      ) : (
        <p>There were no {name}...</p>
      )}
    </>
  );

  return (
    <div className="w-full h-[100vh] center">
      <div className="border-2 w-[60vw] h-[80vh] center">
        {!accesToken && !loadData ? (
          <div className="flex flex-col">
            <h1 className="font-bold text-[1.5rem]">
              Link an account to retrieve transactions.
            </h1>
            <div className="center mt-8">
              <button onClick={() => open()} disabled={!ready}>
                <strong>Link account</strong>
              </button>
            </div>
          </div>
        ) :(
          <div className="center flex-col text-center">
            <h1 className="font-bold text-[1.5rem]">
              You are now officially connected!
            </h1>
            <form className="center">
              <div className="w-64 flex-col center">
                <input
                  className="border-2"
                  type="text"
                  name="count_input"
                  placeholder="count"
                  value={count}
                  onChange={handleChange}
                />
              </div>
            </form>
            <button className="my-8" onClick={getTransactions}>
              Request
            </button>

            {data != null && !loading ? (
              <>
                {LoadData(added, "Added")}
                {LoadData(removed, "Removed")}
                {LoadData(modified, "modified")}
              </>
            ) : loading ? (
              <Loader />
            ) : (
              <p>No request send yet...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
