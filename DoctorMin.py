listOfWords = []


def saveToList():
    while (len(listOfWords) < 100):
        userInput = input('Введите слово: ')
        listOfWords.append(userInput)
        print('Список слов: ', listOfWords)


saveToList()


if len(listOfWords) > 0:
    print('Условие работает')
