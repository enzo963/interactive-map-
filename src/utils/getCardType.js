import { cardTypes } from "../data/cardTypes";

export function getCardType(age) {
    return cardTypes.find(
        (type) => age >= type.minAge && age <= type.maxAge
    )
}

