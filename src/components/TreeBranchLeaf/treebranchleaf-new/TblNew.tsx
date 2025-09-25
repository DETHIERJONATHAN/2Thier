import React from "react";
import { useParams } from 'react-router-dom';
import TblContainer from "./TblContainer";

// Ce composant sert de point d'entrée pour le nouveau module TBL.
// Il pourrait recevoir des props comme l'ID du lead ou l'ID de l'arbre à charger.
const TblNew = () => {
  const { id } = useParams<{ id: string }>();
  return <TblContainer treeId={id} />;
};

export default TblNew;
