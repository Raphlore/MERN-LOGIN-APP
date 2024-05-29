import axios from "axios";
import { useEffect, useState } from "react";
import { getUsername } from "../helper/helper";

axios.defaults.baseURL = process.env.REACT_APP_SERVER_DOMAIN || 'http://localhost:8080';

export default function useFetch(query) {
  const [getData, setData] = useState({
    isLoading: false,
    apiData: undefined,
    status: null,
    serverError: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true }));

        let response;
        if (!query) {
          const { username } = await getUsername();
          response = await axios.get(`api/user/${username}`);
        } else {
          response = await axios.get(`/api/${query}`);
        }

        const { data, status } = response;

        if (status >= 200 && status < 300) { // Handle all successful status codes
          setData(prev => ({
            ...prev,
            isLoading: false,
            apiData: data,
            status: status,
            serverError: null // Reset serverError when successful
          }));
        } else {
          setData(prev => ({
            ...prev,
            isLoading: false,
            serverError: new Error(`Unexpected response status: ${status}`)
          }));
        }
      } catch (error) {
        setData(prev => ({
          ...prev,
          isLoading: false,
          serverError: error
        }));
      }
    };

    fetchData();
  }, [query]);

  return [getData, setData];
}
