import React, { useState } from 'react'

import { Box } from '@material-ui/core'
import { Button, Typography, Icon } from '@equinor/eds-core-react'
import { add } from '@equinor/eds-icons'

import { Action, Participant, Question } from '../../api/models'
import ActionSidebar from './EditForm/ActionEditSidebar'
import PriorityIndicator from './PriorityIndicator'
import { DataToCreateAction } from '../../api/mutations'

interface Props {
    question: Question
    isActionSaving: boolean
    isNoteSaving: boolean
    participants: Participant[]
    onActionCreate: (action: DataToCreateAction) => void
    onActionEdit: (action: Action) => void
    onNoteCreate: (actionId: string, text: string) => void
}

const QuestionActionsList = ({
    question,
    participants,
    onActionCreate,
    onActionEdit,
    onNoteCreate,
    isActionSaving,
    isNoteSaving,
}: Props) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
    const [actionToEditId, setActionToEditId] = useState<string>()
    const actions = [...question.actions]

    const editAction = (action: Action) => {
        setIsSidebarOpen(true)
        setActionToEditId(action.id)
    }

    const onClose = () => {
        setIsSidebarOpen(false)
        setActionToEditId(undefined)
    }

    return (
        <>
            <Box paddingLeft="9rem">
                <Box display="flex" alignItems="center">
                    <Box flexGrow={1}>
                        <Typography variant="body_short" bold>
                            Actions
                        </Typography>
                    </Box>
                    <Box>
                        <Button variant="ghost" onClick={() => setIsSidebarOpen(true)}>
                            <Icon data={add}></Icon>
                            Add action
                        </Button>
                    </Box>
                </Box>
                {actions
                    .sort((a1, a2) => {
                        if (a1.createDate < a2.createDate) {
                            return -1
                        }
                        if (a1.createDate > a2.createDate) {
                            return 1
                        }
                        return 0
                    })
                    .map(action => {
                        return (
                            <div key={action.id}>
                                <Box display="flex">
                                    <Box p="0.3rem">
                                        <PriorityIndicator priority={action.priority} />
                                    </Box>
                                    <Box display="flex" alignItems="center">
                                        <Typography link onClick={() => editAction(action)}>
                                            {action.title}
                                        </Typography>
                                        {action.completed && (
                                            <Typography bold italic>
                                                &nbsp;{'- Completed'}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </div>
                        )
                    })}
                {actions.length === 0 && <Typography italic>No actions added</Typography>}
            </Box>
            <ActionSidebar
                action={actions.find(a => a.id === actionToEditId)}
                isActionSaving={isActionSaving}
                isNoteSaving={isNoteSaving}
                open={isSidebarOpen}
                onClose={onClose}
                connectedQuestion={question}
                possibleAssignees={participants}
                onActionCreate={action => {
                    setIsSidebarOpen(false)
                    onActionCreate(action)
                }}
                onActionEdit={action => {
                    onActionEdit(action)
                }}
                onNoteCreate={(actionId: string, text: string) => {
                    onNoteCreate(actionId, text)
                }}
            />
        </>
    )
}

export default QuestionActionsList
